import {
  Transaction,
  TransactionLifecycleState,
  Conflict,
  SuspiciousActivity,
} from '@reconcilo/shared';
import { IdempotencyService } from './idempotency.service.js';
import { InventoryReconciliationService } from './inventory-reconciliation.service.js';
import { SuspiciousActivityService } from './suspicious-activity.service.js';

export interface ReplayItemResult {
  transaction_id: string;
  device_sequence: number;
  lifecycle_state: TransactionLifecycleState;
  is_duplicate: boolean;
  conflict?: Conflict;
  suspicious_alerts?: SuspiciousActivity[];
  error?: string;
}

export interface BatchReplayResult {
  batch_id: string;
  store_id: string;
  total_transactions: number;
  reconciled_count: number;
  conflict_count: number;
  duplicate_count: number;
  results: ReplayItemResult[];
}

export class TransactionReplayService {
  /**
   * Replays a batch of transactions in deterministic device sequence order.
   * Architecture §8 and rules.md RULE-017, RULE-018, RULE-019.
   */
  static async replayBatch(
    batchId: string,
    storeId: string,
    transactions: Transaction[]
  ): Promise<BatchReplayResult> {
    // 1. Sort deterministically by device_sequence ascending (RULE-017)
    const sortedTxs = [...transactions].sort(
      (a, b) => a.device_sequence - b.device_sequence
    );

    const results: ReplayItemResult[] = [];
    let reconciledCount = 0;
    let conflictCount = 0;
    let duplicateCount = 0;

    const processedInBatch: Transaction[] = [];

    for (const tx of sortedTxs) {
      // 2. Check idempotency (RULE-014, RULE-015)
      const { processed, existing } = await IdempotencyService.isTransactionProcessed(
        tx.transaction_id
      );

      if (processed && existing) {
        duplicateCount++;
        results.push({
          transaction_id: tx.transaction_id,
          device_sequence: tx.device_sequence,
          lifecycle_state: existing.lifecycle_state,
          is_duplicate: true,
        });
        continue;
      }

      // 3. Reconcile against inventory (versioned writes & oversell check)
      const reconResult = await InventoryReconciliationService.reconcileTransaction(tx);

      // 4. Run suspicious activity detection rules (RULE-034-036)
      const suspiciousAlerts = await SuspiciousActivityService.evaluateRules(
        tx,
        processedInBatch
      );

      let finalState = reconResult.lifecycle_state;
      if (suspiciousAlerts.length > 0 && finalState === TransactionLifecycleState.RECONCILED) {
        finalState = TransactionLifecycleState.FLAGGED;
      }

      if (reconResult.success) {
        reconciledCount++;
      } else {
        conflictCount++;
      }

      processedInBatch.push(tx);

      results.push({
        transaction_id: tx.transaction_id,
        device_sequence: tx.device_sequence,
        lifecycle_state: finalState,
        is_duplicate: false,
        conflict: reconResult.conflict,
        suspicious_alerts: suspiciousAlerts.length > 0 ? suspiciousAlerts : undefined,
        error: reconResult.error,
      });
    }

    return {
      batch_id: batchId,
      store_id: storeId,
      total_transactions: transactions.length,
      reconciled_count: reconciledCount,
      conflict_count: conflictCount,
      duplicate_count: duplicateCount,
      results,
    };
  }
}
