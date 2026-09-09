import { describe, it, expect, beforeEach } from 'vitest';
import {
  Transaction,
  TransactionType,
  TransactionLifecycleState,
  ConflictType,
  ConflictStatus,
  Inventory,
  Product,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../../backend/src/adapters/dynamodb.adapter.js';
import { InventoryReconciliationService } from '../../backend/src/services/inventory-reconciliation.service.js';

describe('InventoryReconciliationService (RULE-021 - RULE-027, architecture.md §9)', () => {
  beforeEach(async () => {
    DynamoDBAdapter.resetMockStore();

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

  it('correctly calculates sale effect: Stock_after = Stock_before - Quantity_sold (RULE-022)', async () => {
    // Initial stock = 50
    await DynamoDBAdapter.putItem('Inventory', { store_id: 'store-001', product_id: 'prod-001' }, {
      store_id: 'store-001',
      product_id: 'prod-001',
      quantity: 50,
      version: 1,
      last_updated: new Date().toISOString(),
      status: 'IN_STOCK',
    });

    const tx: Transaction = {
      transaction_id: 'tx-sale-01',
      store_id: 'store-001',
      user_id: 'user-01',
      device_id: 'dev-01',
      device_sequence: 1,
      product_id: 'prod-001',
      quantity: 5,
      unit_price: 25.0,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.PENDING,
      created_at: new Date().toISOString(),
    };

    const result = await InventoryReconciliationService.reconcileTransaction(tx);
    expect(result.success).toBe(true);
    expect(result.lifecycle_state).toBe(TransactionLifecycleState.RECONCILED);
    expect(result.updated_inventory?.quantity).toBe(45);
    expect(result.updated_inventory?.version).toBe(2);
    expect(result.updated_inventory?.status).toBe('IN_STOCK');
  });

  it('detects oversell and transitions transaction to CONFLICT without dropping stock negative (RULE-023)', async () => {
    // Initial stock = 3
    await DynamoDBAdapter.putItem('Inventory', { store_id: 'store-001', product_id: 'prod-001' }, {
      store_id: 'store-001',
      product_id: 'prod-001',
      quantity: 3,
      version: 1,
      last_updated: new Date().toISOString(),
      status: 'LOW_STOCK',
    });

    // Attempt to sell 5
    const tx: Transaction = {
      transaction_id: 'tx-oversell-01',
      store_id: 'store-001',
      user_id: 'user-01',
      device_id: 'dev-01',
      device_sequence: 2,
      product_id: 'prod-001',
      quantity: 5,
      unit_price: 25.0,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.PENDING,
      created_at: new Date().toISOString(),
    };

    const result = await InventoryReconciliationService.reconcileTransaction(tx);
    expect(result.success).toBe(false);
    expect(result.lifecycle_state).toBe(TransactionLifecycleState.CONFLICT);
    expect(result.conflict).toBeDefined();
    expect(result.conflict?.conflict_type).toBe(ConflictType.OVERSOLD);
    expect(result.conflict?.status).toBe(ConflictStatus.OPEN);

    // Stock must stay 3 (not -2)
    const inv = await DynamoDBAdapter.getItem<Inventory>('Inventory', {
      store_id: 'store-001',
      product_id: 'prod-001',
    });
    expect(inv?.quantity).toBe(3);
  });

  it('correctly transitions inventory status to LOW_STOCK and OUT_OF_STOCK', async () => {
    // Initial stock = 12
    await DynamoDBAdapter.putItem('Inventory', { store_id: 'store-001', product_id: 'prod-001' }, {
      store_id: 'store-001',
      product_id: 'prod-001',
      quantity: 12,
      version: 1,
      last_updated: new Date().toISOString(),
      status: 'IN_STOCK',
    });

    // Sell 4 -> 8 (threshold is 10, so should become LOW_STOCK)
    const tx1: Transaction = {
      transaction_id: 'tx-low-01',
      store_id: 'store-001',
      user_id: 'user-01',
      device_id: 'dev-01',
      device_sequence: 1,
      product_id: 'prod-001',
      quantity: 4,
      unit_price: 25.0,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.PENDING,
      created_at: new Date().toISOString(),
    };

    const res1 = await InventoryReconciliationService.reconcileTransaction(tx1);
    expect(res1.updated_inventory?.quantity).toBe(8);
    expect(res1.updated_inventory?.status).toBe('LOW_STOCK');

    // Sell 8 -> 0 -> OUT_OF_STOCK
    const tx2: Transaction = {
      transaction_id: 'tx-out-01',
      store_id: 'store-001',
      user_id: 'user-01',
      device_id: 'dev-01',
      device_sequence: 2,
      product_id: 'prod-001',
      quantity: 8,
      unit_price: 25.0,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.PENDING,
      created_at: new Date().toISOString(),
    };

    const res2 = await InventoryReconciliationService.reconcileTransaction(tx2);
    expect(res2.updated_inventory?.quantity).toBe(0);
    expect(res2.updated_inventory?.status).toBe('OUT_OF_STOCK');
  });

  it('increases stock on RESTOCK transaction', async () => {
    await DynamoDBAdapter.putItem('Inventory', { store_id: 'store-001', product_id: 'prod-001' }, {
      store_id: 'store-001',
      product_id: 'prod-001',
      quantity: 10,
      version: 1,
      last_updated: new Date().toISOString(),
      status: 'LOW_STOCK',
    });

    const tx: Transaction = {
      transaction_id: 'tx-restock-01',
      store_id: 'store-001',
      user_id: 'user-01',
      device_id: 'dev-01',
      device_sequence: 1,
      product_id: 'prod-001',
      quantity: 50,
      unit_price: 25.0,
      type: TransactionType.RESTOCK,
      lifecycle_state: TransactionLifecycleState.PENDING,
      created_at: new Date().toISOString(),
    };

    const res = await InventoryReconciliationService.reconcileTransaction(tx);
    expect(res.updated_inventory?.quantity).toBe(60);
    expect(res.updated_inventory?.status).toBe('IN_STOCK');
  });
});
