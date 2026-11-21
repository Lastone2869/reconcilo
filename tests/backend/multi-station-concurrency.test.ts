import { describe, it, expect, beforeEach } from 'vitest';
import {
  Transaction,
  TransactionType,
  TransactionLifecycleState,
  TABLE_NAMES,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../../backend/src/adapters/dynamodb.adapter.js';
import { InventoryReconciliationService } from '../../backend/src/services/inventory-reconciliation.service.js';
import { IdempotencyService } from '../../backend/src/services/idempotency.service.js';

describe('Multi-Station Concurrent Stress Testing (architecture.md §7, §10, §14, §15)', () => {
  beforeEach(() => {
    DynamoDBAdapter.resetMockStore();
  });

  it('handles 100+ concurrent transactions across 5 stores with SQS FIFO per-store partitioning', async () => {
    const storeIds = ['store-001', 'store-002', 'store-003', 'store-004', 'store-005'];
    const txsPerStore = 20;
    const initialStockPerStore = 500;

    // 1. Initialize inventory for each store
    for (const storeId of storeIds) {
      await DynamoDBAdapter.putItem(
        TABLE_NAMES.INVENTORY,
        { store_id: storeId, product_id: 'prod-stress-01' },
        {
          store_id: storeId,
          product_id: 'prod-stress-01',
          quantity: initialStockPerStore,
          version: 1,
          last_updated: new Date().toISOString(),
          status: 'IN_STOCK',
        }
      );
    }

    // 2. Build transaction queues for each store (simulating independent POS registers)
    const storeQueues: Record<string, Transaction[]> = {};
    for (const storeId of storeIds) {
      storeQueues[storeId] = Array.from({ length: txsPerStore }, (_, i) => ({
        transaction_id: `tx-${storeId}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        store_id: storeId,
        user_id: `staff-reg-${(i % 2) + 1}`,
        device_id: `reg-0${(i % 2) + 1}`,
        device_sequence: i + 1,
        product_id: 'prod-stress-01',
        quantity: 2,
        unit_price: 15.0,
        type: TransactionType.SALE,
        lifecycle_state: TransactionLifecycleState.PENDING,
        created_at: new Date(Date.now() - (txsPerStore - i) * 1000).toISOString(),
      }));
    }

    // 3. Process all 5 stores concurrently in parallel (MessageGroupId = store_id partitioning)
    const storeResults = await Promise.all(
      storeIds.map(async (storeId) => {
        const queue = storeQueues[storeId];
        const outcomes = [];
        for (const tx of queue) {
          const idemp = await IdempotencyService.recordTransactionIdempotent(tx);
          if (!idemp.duplicate) {
            const outcome = await InventoryReconciliationService.reconcileTransaction(tx);
            outcomes.push(outcome);
          }
        }
        return outcomes;
      })
    );

    // 4. Assertions: all 100 transactions succeeded
    const allOutcomes = storeResults.flat();
    expect(allOutcomes.length).toBe(100);
    const successCount = allOutcomes.filter((o) => o.success).length;
    expect(successCount).toBe(100);

    // Verify each store inventory: 500 - (20 * 2) = 460
    for (const storeId of storeIds) {
      const inv = await DynamoDBAdapter.getItem<{ quantity: number; version: number }>(
        TABLE_NAMES.INVENTORY,
        { store_id: storeId, product_id: 'prod-stress-01' }
      );
      expect(inv).toBeDefined();
      expect(inv!.quantity).toBe(460);
      expect(inv!.version).toBe(21); // 1 initial + 20 versioned writes
    }
  });

  it('stress tests inventory exhaustion: prevents negative stock and safely logs conflicts', async () => {
    const storeId = 'store-exhaustion-test';
    const initialStock = 15;

    await DynamoDBAdapter.putItem(
      TABLE_NAMES.INVENTORY,
      { store_id: storeId, product_id: 'prod-limited' },
      {
        store_id: storeId,
        product_id: 'prod-limited',
        quantity: initialStock,
        version: 1,
        last_updated: new Date().toISOString(),
        status: 'IN_STOCK',
      }
    );

    // 15 transactions of 3 units each = 45 units total (30 units over capacity)
    const sales: Transaction[] = Array.from({ length: 15 }, (_, i) => ({
      transaction_id: `tx-exhaust-${i}`,
      store_id: storeId,
      user_id: 'staff-01',
      device_id: 'reg-01',
      device_sequence: i + 1,
      product_id: 'prod-limited',
      quantity: 3,
      unit_price: 20.0,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.PENDING,
      created_at: new Date().toISOString(),
    }));

    // Process FIFO sequence
    const outcomes = [];
    for (const tx of sales) {
      const res = await InventoryReconciliationService.reconcileTransaction(tx);
      outcomes.push(res);
    }

    // Exactly 5 sales should succeed (5 * 3 = 15 units exhausted)
    // 10 sales should be transitioned to CONFLICT
    const succeeded = outcomes.filter((r) => r.success);
    const conflicted = outcomes.filter((r) => !r.success && r.conflict);

    expect(succeeded.length).toBe(5);
    expect(conflicted.length).toBe(10);

    // Final physical stock must be exactly 0, NEVER negative (RULE-023)
    const finalInv = await DynamoDBAdapter.getItem<{ quantity: number }>(
      TABLE_NAMES.INVENTORY,
      { store_id: storeId, product_id: 'prod-limited' }
    );
    expect(finalInv!.quantity).toBe(0);

    // Conflicts table must have exactly 10 logged conflict items
    const allConflicts = await DynamoDBAdapter.queryByAttribute(
      TABLE_NAMES.CONFLICTS,
      'store_id',
      storeId
    );
    expect(allConflicts.length).toBe(10);
  });

  it('stress tests rapid duplicate batch bursts (idempotency under load)', async () => {
    const transactionId = 'tx-duplicate-burst-uuid';
    const storeId = 'store-idempotent-test';

    await DynamoDBAdapter.putItem(
      TABLE_NAMES.INVENTORY,
      { store_id: storeId, product_id: 'prod-idem' },
      {
        store_id: storeId,
        product_id: 'prod-idem',
        quantity: 100,
        version: 1,
        last_updated: new Date().toISOString(),
        status: 'IN_STOCK',
      }
    );

    const baseTx: Transaction = {
      transaction_id: transactionId,
      store_id: storeId,
      user_id: 'staff-01',
      device_id: 'reg-01',
      device_sequence: 1,
      product_id: 'prod-idem',
      quantity: 5,
      unit_price: 10.0,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.PENDING,
      created_at: new Date().toISOString(),
    };

    // 20 concurrent threads trying to record the exact same transaction simultaneously
    const threads = Array.from({ length: 20 });
    const executions = await Promise.all(
      threads.map(async () => {
        const idemp = await IdempotencyService.recordTransactionIdempotent(baseTx);
        if (idemp.duplicate) {
          return { processed: false, reason: 'DUPLICATE' };
        }

        const res = await InventoryReconciliationService.reconcileTransaction(baseTx);
        return { processed: res.success };
      })
    );

    const processedCount = executions.filter((e) => e.processed).length;
    expect(processedCount).toBe(1); // Only 1 should ever process!

    const finalInv = await DynamoDBAdapter.getItem<{ quantity: number }>(
      TABLE_NAMES.INVENTORY,
      { store_id: storeId, product_id: 'prod-idem' }
    );
    expect(finalInv!.quantity).toBe(95); // Exactly 1 sale of 5 units applied!
  });
});
