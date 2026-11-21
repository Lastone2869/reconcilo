import { describe, it, expect, beforeEach } from 'vitest';
import {
  TransactionType,
  TransactionLifecycleState,
  TABLE_NAMES,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../../backend/src/adapters/dynamodb.adapter.js';
import { EODRollupService } from '../../backend/src/services/eod-rollup.service.js';

describe('EODRollupService (FR-09 - FR-15, architecture.md §16)', () => {
  beforeEach(() => {
    DynamoDBAdapter.resetMockStore();
  });

  it('aggregates daily sales, returns, and computes balanced register variance', async () => {
    const storeId = 'store-001';
    const today = new Date().toISOString().slice(0, 10);

    // Seed 2 sales
    await DynamoDBAdapter.putItem(TABLE_NAMES.TRANSACTIONS, { transaction_id: 'tx-1' }, {
      transaction_id: 'tx-1',
      store_id: storeId,
      user_id: 'user-01',
      device_id: 'reg-01',
      device_sequence: 1,
      product_id: 'CF-ESP-1KG',
      quantity: 2,
      unit_price: 24.5,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.COMPLETED,
      created_at: `${today}T10:15:00Z`,
    });

    await DynamoDBAdapter.putItem(TABLE_NAMES.TRANSACTIONS, { transaction_id: 'tx-2' }, {
      transaction_id: 'tx-2',
      store_id: storeId,
      user_id: 'user-01',
      device_id: 'reg-01',
      device_sequence: 2,
      product_id: 'MLK-OAT-1L',
      quantity: 4,
      unit_price: 4.25,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.RECONCILED,
      created_at: `${today}T11:30:00Z`,
    });

    // Seed 1 return
    await DynamoDBAdapter.putItem(TABLE_NAMES.TRANSACTIONS, { transaction_id: 'tx-3' }, {
      transaction_id: 'tx-3',
      store_id: storeId,
      user_id: 'user-01',
      device_id: 'reg-01',
      device_sequence: 3,
      product_id: 'MLK-OAT-1L',
      quantity: 1,
      unit_price: 4.25,
      type: TransactionType.RETURN,
      lifecycle_state: TransactionLifecycleState.COMPLETED,
      created_at: `${today}T14:00:00Z`,
    });

    const report = await EODRollupService.generateRollup({
      store_id: storeId,
      date: today,
      opening_cash: 200.0,
      actor: 'manager-01',
      notes: 'Evening shift register balanced and reconciled.',
    });

    expect(report.store_id).toBe(storeId);
    expect(report.total_units_sold).toBe(6);
    expect(report.returns_count).toBe(1);
    expect(report.returns_total).toBe(4.25);
    expect(report.total_gross_sales).toBe(66.0); // 49.0 + 17.0
    expect(report.reconciled_transactions_count).toBe(2);
    expect(report.manager_signoff).toBeDefined();
    expect(report.manager_signoff?.signed_by).toBe('manager-01');
    expect(report.register_discrepancy).toBe(0.0);
  });

  it('detects and flags register discrepancies when physical cash does not match expected', async () => {
    const storeId = 'store-002';
    const today = new Date().toISOString().slice(0, 10);

    const report = await EODRollupService.generateRollup({
      store_id: storeId,
      date: today,
      opening_cash: 200.0,
      actual_physical_cash: 520.0, // expected is 540 (200 + 340) -> -20 discrepancy
      actor: 'manager-02',
    });

    expect(report.register_discrepancy).toBe(-20.0);
  });

  it('executes scheduled fleetwide midnight rollups across all stores', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = await EODRollupService.executeFleetwideEODRollup(today);

    expect(result.success).toBe(true);
    expect(result.storesProcessed).toBe(4);
    expect(result.reports.length).toBe(4);

    const historical = await EODRollupService.getRollups();
    expect(historical.length).toBeGreaterThanOrEqual(4);
  });
});
