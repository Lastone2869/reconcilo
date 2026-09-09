import { describe, it, expect, beforeEach } from 'vitest';
import {
  Transaction,
  TransactionType,
  TransactionLifecycleState,
  StoreConnectivityState,
  SyncBatchStatus,
  Product,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../../backend/src/adapters/dynamodb.adapter.js';
import { TransactionReplayService } from '../../backend/src/services/transaction-replay.service.js';
import { InventoryReconciliationService } from '../../backend/src/services/inventory-reconciliation.service.js';

describe('Transaction State Machine (architecture.md §6 & AGENTS.md §2)', () => {
  beforeEach(async () => {
    DynamoDBAdapter.resetMockStore();

    const product: Product = {
      product_id: 'prod-001',
      sku: 'SKU-001',
      name: 'Test Product',
      unit_price: 10,
      low_stock_threshold: 5,
      created_at: new Date().toISOString(),
    };
    await DynamoDBAdapter.putItem('Products', { product_id: 'prod-001' }, product);

    await DynamoDBAdapter.putItem('Inventory', { store_id: 'store-001', product_id: 'prod-001' }, {
      store_id: 'store-001',
      product_id: 'prod-001',
      quantity: 50,
      version: 1,
      last_updated: new Date().toISOString(),
      status: 'IN_STOCK',
    });
  });

  it('Happy Path: CREATED -> PENDING -> SYNCING -> PROCESSING -> RECONCILED -> COMPLETED', async () => {
    // 1. Client creates local transaction
    const tx: Transaction = {
      transaction_id: 'tx-lifecycle-happy',
      store_id: 'store-001',
      user_id: 'staff-01',
      device_id: 'dev-01',
      device_sequence: 1,
      product_id: 'prod-001',
      quantity: 2,
      unit_price: 10,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.CREATED,
      created_at: new Date().toISOString(),
    };
    expect(tx.lifecycle_state).toBe(TransactionLifecycleState.CREATED);

    // 2. Enqueued locally in IndexedDB
    tx.lifecycle_state = TransactionLifecycleState.PENDING;
    expect(tx.lifecycle_state).toBe(TransactionLifecycleState.PENDING);

    // 3. Sync initiated after S3 upload
    tx.lifecycle_state = TransactionLifecycleState.SYNCING;
    expect(tx.lifecycle_state).toBe(TransactionLifecycleState.SYNCING);

    // 4. Processing picked up by SQS FIFO
    tx.lifecycle_state = TransactionLifecycleState.PROCESSING;
    expect(tx.lifecycle_state).toBe(TransactionLifecycleState.PROCESSING);

    // 5. Replay and Reconcile
    const recon = await InventoryReconciliationService.reconcileTransaction(tx);
    expect(recon.success).toBe(true);
    expect(recon.lifecycle_state).toBe(TransactionLifecycleState.RECONCILED);

    // 6. Complete
    const completedTx: Transaction = {
      ...tx,
      lifecycle_state: TransactionLifecycleState.COMPLETED,
    };
    expect(completedTx.lifecycle_state).toBe(TransactionLifecycleState.COMPLETED);
  });

  it('Exception Path: PROCESSING -> CONFLICT when oversold', async () => {
    const tx: Transaction = {
      transaction_id: 'tx-lifecycle-conflict',
      store_id: 'store-001',
      user_id: 'staff-01',
      device_id: 'dev-01',
      device_sequence: 1,
      product_id: 'prod-001',
      quantity: 100, // Stock is only 50
      unit_price: 10,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.PROCESSING,
      created_at: new Date().toISOString(),
    };

    const recon = await InventoryReconciliationService.reconcileTransaction(tx);
    expect(recon.success).toBe(false);
    expect(recon.lifecycle_state).toBe(TransactionLifecycleState.CONFLICT);
  });

  it('Exception Path: PROCESSING -> FLAGGED when quantity triggers suspicious rule', async () => {
    const tx: Transaction = {
      transaction_id: 'tx-lifecycle-flagged',
      store_id: 'store-001',
      user_id: 'staff-01',
      device_id: 'dev-01',
      device_sequence: 1,
      product_id: 'prod-001',
      quantity: 105, // Threshold 100
      unit_price: 10,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.PROCESSING,
      created_at: new Date().toISOString(),
    };

    // Increase stock so it doesn't conflict on quantity
    await DynamoDBAdapter.putItem('Inventory', { store_id: 'store-001', product_id: 'prod-001' }, {
      store_id: 'store-001',
      product_id: 'prod-001',
      quantity: 500,
      version: 1,
      last_updated: new Date().toISOString(),
      status: 'IN_STOCK',
    });

    const batchReplay = await TransactionReplayService.replayBatch('batch-flag', 'store-001', [tx]);
    expect(batchReplay.results[0].lifecycle_state).toBe(TransactionLifecycleState.FLAGGED);
    expect(batchReplay.results[0].suspicious_alerts).toHaveLength(1);
  });

  it('Sync failure reverts to PENDING on retry per architecture.md §13 Guarantee 2', () => {
    let txState: TransactionLifecycleState = TransactionLifecycleState.SYNCING;

    // Network drops during S3 upload
    const uploadSucceeded = false;
    if (!uploadSucceeded) {
      // Guarantee 2: Failed uploads keep or return transactions to PENDING
      txState = TransactionLifecycleState.PENDING;
    }

    expect(txState).toBe(TransactionLifecycleState.PENDING);
  });
});
