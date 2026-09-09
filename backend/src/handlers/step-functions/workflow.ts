import {
  Transaction,
  TransactionLifecycleState,
  DEFAULT_SYSTEM_CONFIG,
  NotificationType,
} from '@reconcilo/shared';
import { InventoryReconciliationService } from '../../services/inventory-reconciliation.service.js';
import { ConflictDetectionService } from '../../services/conflict-detection.service.js';
import { SuspiciousActivityService } from '../../services/suspicious-activity.service.js';
import { NotificationService } from '../../services/notification.service.js';

export interface WorkflowInput {
  batch_id: string;
  store_id: string;
  transactions: Transaction[];
}

/**
 * Step 1: Validate & Replay
 */
export async function validateAndReplayStep(input: WorkflowInput): Promise<any> {
  console.log('[SF STEP 1: Validate & Replay]', input.batch_id);
  const sorted = [...input.transactions].sort((a, b) => a.device_sequence - b.device_sequence);
  return {
    ...input,
    transactions: sorted,
    status: 'VALIDATED',
  };
}

/**
 * Step 2: Reconcile Inventory (versioned writes & oversell check)
 */
export async function reconcileInventoryStep(input: WorkflowInput): Promise<any> {
  console.log('[SF STEP 2: Reconcile Inventory]', input.batch_id);
  const outcomes = [];
  for (const tx of input.transactions) {
    const outcome = await InventoryReconciliationService.reconcileTransaction(tx);
    outcomes.push({ tx_id: tx.transaction_id, ...outcome });
  }
  return {
    ...input,
    reconciliation_outcomes: outcomes,
  };
}

/**
 * Step 3: Conflict Check
 */
export async function conflictCheckStep(input: any): Promise<any> {
  console.log('[SF STEP 3: Conflict Check]', input.batch_id);
  const conflicts = input.reconciliation_outcomes?.filter(
    (o: any) => o.lifecycle_state === TransactionLifecycleState.CONFLICT
  ) || [];
  return {
    ...input,
    conflicts_found: conflicts.length,
    conflicts,
  };
}

/**
 * Step 4: Suspicious Activity Check
 */
export async function suspiciousActivityCheckStep(input: any): Promise<any> {
  console.log('[SF STEP 4: Suspicious Check]', input.batch_id);
  const flagged = [];
  for (const tx of input.transactions) {
    const alerts = await SuspiciousActivityService.evaluateRules(tx, [], DEFAULT_SYSTEM_CONFIG);
    if (alerts.length > 0) {
      flagged.push({ tx_id: tx.transaction_id, alerts });
    }
  }
  return {
    ...input,
    flagged_alerts: flagged,
  };
}

/**
 * Step 5: Consolidate Outcome
 */
export async function consolidateOutcomeStep(input: any): Promise<any> {
  console.log('[SF STEP 5: Consolidate]', input.batch_id);
  return {
    batch_id: input.batch_id,
    store_id: input.store_id,
    reconciled_count: input.transactions?.length - (input.conflicts_found || 0),
    conflicts_count: input.conflicts_found || 0,
    flagged_count: input.flagged_alerts?.length || 0,
    completed_at: new Date().toISOString(),
  };
}

/**
 * Step 6: Notify (SNS / SES if conflicts or flags found)
 */
export async function notifyStep(input: any): Promise<any> {
  console.log('[SF STEP 6: Notify]', input.batch_id);
  if (input.conflicts_count > 0 || input.flagged_count > 0) {
    await NotificationService.sendOperationalAlert({
      type: input.conflicts_count > 0 ? (NotificationType as any).CONFLICT_DETECTED : (NotificationType as any).SUSPICIOUS_ACTIVITY,
      subject: `[RECONCILIATION SUMMARY] Store: ${input.store_id} Batch: ${input.batch_id}`,
      message: `Batch reconciliation finished with ${input.conflicts_count} conflicts and ${input.flagged_count} flagged transactions.`,
      relatedEventId: input.batch_id,
    });
  }
  return { success: true };
}
