import { describe, it, expect, beforeEach } from 'vitest';
import {
  Transaction,
  TransactionType,
  TransactionLifecycleState,
  Inventory,
  Product,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../../backend/src/adapters/dynamodb.adapter.js';
import { IdempotencyService } from '../../backend/src/services/idempotency.service.js';
import { InventoryReconciliationService } from '../../backend/src/services/inventory-reconciliation.service.js';

describe('Idempotency & Concurrency (RULE-014, RULE-015, RULE-019, AGENTS.md §6)', () => {
  beforeEach(async () => {
    DynamoDBAdapter.resetMockStore();

    // Initial stock = 50
    const inventory: Inventory = {
      store_id: 'store-001',
      product_id: 'prod-001',
      quantity: 50,
      version: 1,
      last_updated: new Date().toISOString(),
      status: 'IN_STOCK',
    };
    await DynamoDBAdapter.putItem('Inventory', { store_id: 'store-001', product_id: 'prod-001' }, inventory);

    const product: Product = {
      product_id: 'prod-001',
      sku: 'SKU-COFFEE-BEAN',
      name: 'Artisan Coffee Beans 1kg',
      unit_price: 25.0,
      low_stock_threshold: 10,
      created_at: new Date().toISOString(),
    };
    await DynamoDBAdapter.putItem('Products', { product_id: 'prod-001' }, product);
  });

  it('prevents duplicate processing of the same transaction_id (RULE-015, RULE-019)', async () => {
    const tx: Transaction = {
      transaction_id: 'tx-unique-100',
      store_id: 'store-001',
      user_id: 'staff-001',
      device_id: 'dev-01',
      device_sequence: 1,
      product_id: 'prod-001',
      quantity: 5,
      unit_price: 25.0,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.PENDING,
      created_at: new Date().toISOString(),
    };

    // First write
    const firstWrite = await IdempotencyService.recordTransactionIdempotent(tx);
    expect(firstWrite.success).toBe(true);
    expect(firstWrite.duplicate).toBe(false);

    // First reconciliation
    const recon1 = await InventoryReconciliationService.reconcileTransaction(tx);
    expect(recon1.success).toBe(true);

    const invAfterFirst = await DynamoDBAdapter.getItem<Inventory>('Inventory', {
      store_id: 'store-001',
      product_id: 'prod-001',
    });
    expect(invAfterFirst?.quantity).toBe(45); // 50 - 5 = 45

    // Second write attempt with same transaction_id (replay attempt)
    const secondWrite = await IdempotencyService.recordTransactionIdempotent(tx);
    expect(secondWrite.success).toBe(false);
    expect(secondWrite.duplicate).toBe(true);

    // Check processed state
    const processedCheck = await IdempotencyService.isTransactionProcessed('tx-unique-100');
    expect(processedCheck.processed).toBe(true);

    // Verify stock remains exactly 45 (no double deduction)
    const invAfterReplay = await DynamoDBAdapter.getItem<Inventory>('Inventory', {
      store_id: 'store-001',
      product_id: 'prod-001',
    });
    expect(invAfterReplay?.quantity).toBe(45);
  });

  it('rejects versioned write when version is stale (optimistic concurrency, §14 Guarantee 4)', async () => {
    const staleVersion = 99; // Current version in table is 1
    const updateResult = await DynamoDBAdapter.versionedUpdate<Inventory>(
      'Inventory',
      { store_id: 'store-001', product_id: 'prod-001' },
      { quantity: 20 },
      staleVersion
    );

    expect(updateResult.success).toBe(false);
    expect(updateResult.error).toContain('ConditionalCheckFailedException');

    // Ensure inventory quantity unchanged
    const currentInv = await DynamoDBAdapter.getItem<Inventory>('Inventory', {
      store_id: 'store-001',
      product_id: 'prod-001',
    });
    expect(currentInv?.quantity).toBe(50);
  });
});
