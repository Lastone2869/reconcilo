import {
  Transaction,
  SuspiciousActivity,
  SuspiciousActivityStatus,
  SuspiciousRuleType,
  SystemConfig,
  DEFAULT_SYSTEM_CONFIG,
  TransactionType,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';

export class SuspiciousActivityService {
  /**
   * Evaluates a transaction against suspicious activity rules per rules.md RULE-033 to RULE-038.
   */
  static async evaluateRules(
    tx: Transaction,
    recentStoreTransactions: Transaction[] = [],
    config: SystemConfig = DEFAULT_SYSTEM_CONFIG
  ): Promise<SuspiciousActivity[]> {
    const flaggedAlerts: SuspiciousActivity[] = [];
    const now = new Date(tx.created_at || Date.now()).getTime();
    const windowMs = config.suspicious_time_window_minutes * 60 * 1000;

    // RULE-034: Excessive quantity rule
    if (tx.quantity > config.suspicious_quantity_threshold) {
      const alertId = `alert-qty-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const alert: SuspiciousActivity = {
        alert_id: alertId,
        store_id: tx.store_id,
        user_id: tx.user_id,
        transaction_ids: [tx.transaction_id],
        triggered_rule: SuspiciousRuleType.EXCESSIVE_QUANTITY,
        rule_description: `Transaction quantity (${tx.quantity}) exceeds threshold of ${config.suspicious_quantity_threshold}`,
        threshold_value: config.suspicious_quantity_threshold,
        actual_value: tx.quantity,
        status: SuspiciousActivityStatus.FLAGGED,
        detected_at: new Date().toISOString(),
      };
      await DynamoDBAdapter.putItem('SuspiciousActivity', { alert_id: alertId }, alert);
      flaggedAlerts.push(alert);
    }

    // RULE-035: Repeated unusual transactions in time window
    const recentWindowTxs = recentStoreTransactions.filter((t) => {
      const tTime = new Date(t.created_at).getTime();
      return Math.abs(now - tTime) <= windowMs && t.product_id === tx.product_id;
    });

    if (recentWindowTxs.length + 1 >= config.suspicious_repeat_count_threshold) {
      const alertId = `alert-rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const allTxIds = [...recentWindowTxs.map((t) => t.transaction_id), tx.transaction_id];
      const alert: SuspiciousActivity = {
        alert_id: alertId,
        store_id: tx.store_id,
        user_id: tx.user_id,
        transaction_ids: allTxIds,
        triggered_rule: SuspiciousRuleType.REPEATED_UNUSUAL_TRANSACTIONS,
        rule_description: `High frequency of transactions (${allTxIds.length}) on product in ${config.suspicious_time_window_minutes} min window`,
        threshold_value: config.suspicious_repeat_count_threshold,
        actual_value: allTxIds.length,
        status: SuspiciousActivityStatus.FLAGGED,
        detected_at: new Date().toISOString(),
      };
      await DynamoDBAdapter.putItem('SuspiciousActivity', { alert_id: alertId }, alert);
      flaggedAlerts.push(alert);
    }

    // RULE-036: Repeated reversals (returns/voids) in time window
    const reversalTxs = recentStoreTransactions.filter((t) => {
      const tTime = new Date(t.created_at).getTime();
      return Math.abs(now - tTime) <= windowMs && t.type === TransactionType.RETURN;
    });

    if (tx.type === TransactionType.RETURN && reversalTxs.length + 1 >= 3) {
      const alertId = `alert-rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const allTxIds = [...reversalTxs.map((t) => t.transaction_id), tx.transaction_id];
      const alert: SuspiciousActivity = {
        alert_id: alertId,
        store_id: tx.store_id,
        user_id: tx.user_id,
        transaction_ids: allTxIds,
        triggered_rule: SuspiciousRuleType.REPEATED_REVERSALS,
        rule_description: `Repeated reversals/returns (${allTxIds.length}) detected within ${config.suspicious_time_window_minutes} min window`,
        threshold_value: 3,
        actual_value: allTxIds.length,
        status: SuspiciousActivityStatus.FLAGGED,
        detected_at: new Date().toISOString(),
      };
      await DynamoDBAdapter.putItem('SuspiciousActivity', { alert_id: alertId }, alert);
      flaggedAlerts.push(alert);
    }

    return flaggedAlerts;
  }

  /**
   * Reviews a flagged alert (Manager or Admin only per RULE-038).
   */
  static async reviewAlert(
    alertId: string,
    reviewedBy: string,
    reviewNotes: string
  ): Promise<SuspiciousActivity | null> {
    const existing = await DynamoDBAdapter.getItem<SuspiciousActivity>('SuspiciousActivity', {
      alert_id: alertId,
    });
    if (!existing) return null;

    const updated: SuspiciousActivity = {
      ...existing,
      status: SuspiciousActivityStatus.REVIEWED,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      review_notes: reviewNotes,
    };

    await DynamoDBAdapter.putItem('SuspiciousActivity', { alert_id: alertId }, updated);
    return updated;
  }
}
