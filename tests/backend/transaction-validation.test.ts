import { describe, it, expect, beforeEach } from 'vitest';
import {
  CreateTransactionRequest,
  TransactionType,
  Product,
  Store,
  StoreConnectivityState,
} from '@reconcilo/shared';
import { TransactionValidationService } from '../../backend/src/services/transaction-validation.service.js';
import { DynamoDBAdapter } from '../../backend/src/adapters/dynamodb.adapter.js';

describe('TransactionValidationService (RULE-005 - RULE-008)', () => {
  beforeEach(async () => {
    DynamoDBAdapter.resetMockStore();

    // Seed test product and store
    const product: Product = {
      product_id: 'prod-001',
      sku: 'SKU-COFFEE-BEAN',
      name: 'Artisan Coffee Beans 1kg',
      unit_price: 25.0,
      low_stock_threshold: 10,
      created_at: new Date().toISOString(),
    };
    await DynamoDBAdapter.putItem('Products', { product_id: 'prod-001' }, product);

    const store: Store = {
      store_id: 'store-001',
      name: 'Downtown Flagship',
      connectivity_state: StoreConnectivityState.ONLINE,
      last_successful_sync: new Date().toISOString(),
      last_sync_attempt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    await DynamoDBAdapter.putItem('Stores', { store_id: 'store-001' }, store);
  });

  it('passes valid transaction with all required fields (Happy Path)', async () => {
    const tx: CreateTransactionRequest = {
      transaction_id: 'tx-test-001',
      user_id: 'staff-001',
      device_id: 'pos-terminal-01',
      device_sequence: 1,
      product_id: 'prod-001',
      quantity: 2,
      unit_price: 25.0,
      type: TransactionType.SALE,
      created_at: new Date().toISOString(),
    };

    const result = await TransactionValidationService.validate('store-001', tx);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.product?.product_id).toBe('prod-001');
    expect(result.store?.store_id).toBe('store-001');
  });

  it('rejects transaction when required fields are missing (RULE-005)', async () => {
    const tx: Partial<CreateTransactionRequest> = {
      transaction_id: '',
      quantity: 2,
      product_id: 'prod-001',
    };

    const result = await TransactionValidationService.validate('store-001', tx as any);
    expect(result.valid).toBe(false);
    const missingFields = result.issues.map((i) => i.field);
    expect(missingFields).toContain('transaction_id');
    expect(missingFields).toContain('user_id');
    expect(missingFields).toContain('device_id');
    expect(missingFields).toContain('type');
  });

  it('rejects invalid quantity <= 0 or non-numeric (RULE-006)', async () => {
    const tx: CreateTransactionRequest = {
      transaction_id: 'tx-test-002',
      user_id: 'staff-001',
      device_id: 'pos-terminal-01',
      device_sequence: 2,
      product_id: 'prod-001',
      quantity: 0, // Invalid!
      unit_price: 25.0,
      type: TransactionType.SALE,
      created_at: new Date().toISOString(),
    };

    const result = await TransactionValidationService.validate('store-001', tx);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === 'RULE-006')).toBe(true);
  });

  it('rejects unknown product_id not in catalog (RULE-007)', async () => {
    const tx: CreateTransactionRequest = {
      transaction_id: 'tx-test-003',
      user_id: 'staff-001',
      device_id: 'pos-terminal-01',
      device_sequence: 3,
      product_id: 'prod-nonexistent-999',
      quantity: 1,
      unit_price: 25.0,
      type: TransactionType.SALE,
      created_at: new Date().toISOString(),
    };

    const result = await TransactionValidationService.validate('store-001', tx);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === 'RULE-007')).toBe(true);
  });

  it('rejects unauthorized/nonexistent store_id (RULE-008)', async () => {
    const tx: CreateTransactionRequest = {
      transaction_id: 'tx-test-004',
      user_id: 'staff-001',
      device_id: 'pos-terminal-01',
      device_sequence: 4,
      product_id: 'prod-001',
      quantity: 1,
      unit_price: 25.0,
      type: TransactionType.SALE,
      created_at: new Date().toISOString(),
    };

    const result = await TransactionValidationService.validate('store-ghost-404', tx);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.rule === 'RULE-008')).toBe(true);
  });
});
