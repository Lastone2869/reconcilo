import {
  Inventory,
  Transaction,
  TransactionLifecycleState,
  TransactionType,
  ConflictType,
  Conflict,
  Product,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';
import { ConflictDetectionService } from './conflict-detection.service.js';

export interface ReconciliationOutcome {
  success: boolean;
  lifecycle_state: TransactionLifecycleState;
  updated_inventory?: Inventory;
  conflict?: Conflict;
  error?: string;
}

export class InventoryReconciliationService {
  /**
   * Reconciles a single transaction against inventory with versioned writes and oversell protection.
   * Architecture §9 and rules.md RULE-021, RULE-022, RULE-023, RULE-025, RULE-026.
   */
  static async reconcileTransaction(
    tx: Transaction,
    maxRetries = 3
  ): Promise<ReconciliationOutcome> {
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;

      // 1. Fetch current inventory record
      let inventory = await DynamoDBAdapter.getItem<Inventory>('Inventory', {
        store_id: tx.store_id,
        product_id: tx.product_id,
      });

      // If no inventory record exists, initialize with 0
      if (!inventory) {
        inventory = {
          store_id: tx.store_id,
          product_id: tx.product_id,
          quantity: 0,
          version: 1,
          last_updated: new Date().toISOString(),
          status: 'OUT_OF_STOCK',
        };
        await DynamoDBAdapter.putItem('Inventory', {
          store_id: tx.store_id,
          product_id: tx.product_id,
        }, inventory);
      }

      // 2. Fetch product for threshold
      const product = await DynamoDBAdapter.getItem<Product>('Products', {
        product_id: tx.product_id,
      });
      const lowStockThreshold = product?.low_stock_threshold ?? 10;

      // 3. Compute new stock based on transaction type (RULE-022)
      let quantityDelta = 0;
      if (tx.type === TransactionType.SALE) {
        quantityDelta = -tx.quantity;
      } else if (tx.type === TransactionType.RETURN || tx.type === TransactionType.RESTOCK) {
        quantityDelta = tx.quantity;
      } else if (tx.type === TransactionType.ADJUSTMENT) {
        quantityDelta = tx.quantity;
      }

      const expectedStock = inventory.quantity + quantityDelta;

      // 4. Oversell detection (RULE-023)
      if (expectedStock < 0) {
        const conflict = await ConflictDetectionService.recordConflict({
          store_id: tx.store_id,
          product_id: tx.product_id,
          transaction_ids: [tx.transaction_id],
          conflict_type: ConflictType.OVERSOLD,
          expected_state: expectedStock,
          actual_state: inventory.quantity,
          difference: Math.abs(expectedStock),
          resolution_notes: `Oversell detected: Attempted to deduct ${tx.quantity} from current stock ${inventory.quantity}`,
        });

        // Update transaction state to CONFLICT
        await DynamoDBAdapter.putItem<Transaction>('Transactions', { transaction_id: tx.transaction_id }, {
          ...tx,
          lifecycle_state: TransactionLifecycleState.CONFLICT,
        });

        return {
          success: false,
          lifecycle_state: TransactionLifecycleState.CONFLICT,
          conflict,
          error: 'Oversell detected: insufficient inventory',
        };
      }

      // 5. Determine new inventory status
      let newStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
      if (expectedStock === 0) {
        newStatus = 'OUT_OF_STOCK';
      } else if (expectedStock <= lowStockThreshold) {
        newStatus = 'LOW_STOCK';
      }

      // 6. Optimistic versioned write (RULE-025, Guarantee 4)
      const updateResult = await DynamoDBAdapter.versionedUpdate<Inventory>(
        'Inventory',
        { store_id: tx.store_id, product_id: tx.product_id },
        {
          quantity: expectedStock,
          status: newStatus,
        },
        inventory.version
      );

      if (updateResult.success && updateResult.updatedItem) {
        // Update transaction to RECONCILED
        await DynamoDBAdapter.putItem<Transaction>('Transactions', { transaction_id: tx.transaction_id }, {
          ...tx,
          lifecycle_state: TransactionLifecycleState.RECONCILED,
          processed_at: new Date().toISOString(),
        });

        return {
          success: true,
          lifecycle_state: TransactionLifecycleState.RECONCILED,
          updated_inventory: updateResult.updatedItem,
        };
      }

      // If version mismatch occurred and we have remaining retries, loop again with jittered backoff
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 10 * attempt)));
    }

    // Retries exhausted -> Record STALE_VERSION conflict
    const finalInventory = await DynamoDBAdapter.getItem<Inventory>('Inventory', {
      store_id: tx.store_id,
      product_id: tx.product_id,
    });

    const conflict = await ConflictDetectionService.recordConflict({
      store_id: tx.store_id,
      product_id: tx.product_id,
      transaction_ids: [tx.transaction_id],
      conflict_type: ConflictType.STALE_VERSION,
      expected_state: 0,
      actual_state: finalInventory?.quantity ?? 0,
      difference: tx.quantity,
      resolution_notes: `Concurrent write collision: version mismatch exhausted ${maxRetries} retries`,
    });

    await DynamoDBAdapter.putItem<Transaction>('Transactions', { transaction_id: tx.transaction_id }, {
      ...tx,
      lifecycle_state: TransactionLifecycleState.CONFLICT,
    });

    return {
      success: false,
      lifecycle_state: TransactionLifecycleState.CONFLICT,
      conflict,
      error: 'Concurrency version mismatch exhausted retries',
    };
  }
}
