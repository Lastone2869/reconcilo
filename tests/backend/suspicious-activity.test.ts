import { describe, it, expect, beforeEach } from 'vitest';
import {
  Transaction,
  TransactionType,
  TransactionLifecycleState,
  SuspiciousActivityStatus,
  SuspiciousRuleType,
  DEFAULT_SYSTEM_CONFIG,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../../backend/src/adapters/dynamodb.adapter.js';
import { SuspiciousActivityService } from '../../backend/src/services/suspicious-activity.service.js';

describe('SuspiciousActivityService (RULE-033 - RULE-038)', () => {
  beforeEach(() => {
    DynamoDBAdapter.resetMockStore();
  });

  it('flags transaction with excessive quantity > threshold (RULE-034)', async () => {
    const tx: Transaction = {
      transaction_id: 'tx-susp-qty',
      store_id: 'store-001',
      user_id: 'user-01',
      device_id: 'dev-01',
      device_sequence: 1,
      product_id: 'prod-001',
      quantity: 150, // Default threshold is 100
      unit_price: 25.0,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.PENDING,
      created_at: new Date().toISOString(),
    };

    const alerts = await SuspiciousActivityService.evaluateRules(tx, [], DEFAULT_SYSTEM_CONFIG);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].status).toBe(SuspiciousActivityStatus.FLAGGED);
    expect(alerts[0].triggered_rule).toBe(SuspiciousRuleType.EXCESSIVE_QUANTITY);
    expect(alerts[0].actual_value).toBe(150);
  });

  it('flags repeated unusual transactions within time window (RULE-035)', async () => {
    const now = Date.now();
    const recentTxs: Transaction[] = [1, 2, 3, 4].map((seq) => ({
      transaction_id: `tx-rep-${seq}`,
      store_id: 'store-001',
      user_id: 'user-01',
      device_id: 'dev-01',
      device_sequence: seq,
      product_id: 'prod-001',
      quantity: 10,
      unit_price: 25.0,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.RECONCILED,
      created_at: new Date(now - seq * 60 * 1000).toISOString(), // 1-4 mins ago
    }));

    const currentTx: Transaction = {
      transaction_id: 'tx-rep-5',
      store_id: 'store-001',
      user_id: 'user-01',
      device_id: 'dev-01',
      device_sequence: 5,
      product_id: 'prod-001',
      quantity: 10,
      unit_price: 25.0,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.PENDING,
      created_at: new Date(now).toISOString(),
    };

    const alerts = await SuspiciousActivityService.evaluateRules(currentTx, recentTxs, DEFAULT_SYSTEM_CONFIG);
    const repeatAlert = alerts.find((a) => a.triggered_rule === SuspiciousRuleType.REPEATED_UNUSUAL_TRANSACTIONS);
    expect(repeatAlert).toBeDefined();
    expect(repeatAlert?.status).toBe(SuspiciousActivityStatus.FLAGGED);
  });

  it('flags repeated reversals (returns) in time window (RULE-036)', async () => {
    const now = Date.now();
    const reversalTxs: Transaction[] = [1, 2].map((seq) => ({
      transaction_id: `tx-rev-${seq}`,
      store_id: 'store-001',
      user_id: 'user-01',
      device_id: 'dev-01',
      device_sequence: seq,
      product_id: 'prod-001',
      quantity: 1,
      unit_price: 25.0,
      type: TransactionType.RETURN,
      lifecycle_state: TransactionLifecycleState.RECONCILED,
      created_at: new Date(now - seq * 60 * 1000).toISOString(),
    }));

    const currentReversal: Transaction = {
      transaction_id: 'tx-rev-3',
      store_id: 'store-001',
      user_id: 'user-01',
      device_id: 'dev-01',
      device_sequence: 3,
      product_id: 'prod-001',
      quantity: 1,
      unit_price: 25.0,
      type: TransactionType.RETURN,
      lifecycle_state: TransactionLifecycleState.PENDING,
      created_at: new Date(now).toISOString(),
    };

    const alerts = await SuspiciousActivityService.evaluateRules(currentReversal, reversalTxs, DEFAULT_SYSTEM_CONFIG);
    const revAlert = alerts.find((a) => a.triggered_rule === SuspiciousRuleType.REPEATED_REVERSALS);
    expect(revAlert).toBeDefined();
    expect(revAlert?.status).toBe(SuspiciousActivityStatus.FLAGGED);
  });

  it('allows Manager/Admin review to transition status to REVIEWED (RULE-038)', async () => {
    const tx: Transaction = {
      transaction_id: 'tx-susp-review',
      store_id: 'store-001',
      user_id: 'user-01',
      device_id: 'dev-01',
      device_sequence: 1,
      product_id: 'prod-001',
      quantity: 200,
      unit_price: 25.0,
      type: TransactionType.SALE,
      lifecycle_state: TransactionLifecycleState.PENDING,
      created_at: new Date().toISOString(),
    };

    const alerts = await SuspiciousActivityService.evaluateRules(tx, [], DEFAULT_SYSTEM_CONFIG);
    const alertId = alerts[0].alert_id;

    const reviewed = await SuspiciousActivityService.reviewAlert(
      alertId,
      'manager-001',
      'Verified with customer: Bulk catering order'
    );

    expect(reviewed?.status).toBe(SuspiciousActivityStatus.REVIEWED);
    expect(reviewed?.reviewed_by).toBe('manager-001');
    expect(reviewed?.review_notes).toContain('Bulk catering order');
  });
});
