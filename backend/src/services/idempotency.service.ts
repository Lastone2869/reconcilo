import {
  Transaction,
  SyncBatch,
  TransactionLifecycleState,
  SyncBatchStatus,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';

export class IdempotencyService {
  /**
   * Checks if a transaction has already been processed or stored.
   */
  static async isTransactionProcessed(transactionId: string): Promise<{
    processed: boolean;
    existing?: Transaction;
  }> {
    const existing = await DynamoDBAdapter.getItem<Transaction>('Transactions', {
      transaction_id: transactionId,
    });

    if (existing) {
      return {
        processed:
          existing.lifecycle_state === TransactionLifecycleState.RECONCILED ||
          existing.lifecycle_state === TransactionLifecycleState.COMPLETED,
        existing,
      };
    }

    return { processed: false };
  }

  /**
   * Checks if a sync batch has already been processed.
   */
  static async isBatchProcessed(batchId: string): Promise<{
    processed: boolean;
    existing?: SyncBatch;
  }> {
    const existing = await DynamoDBAdapter.getItem<SyncBatch>('SyncBatches', {
      batch_id: batchId,
    });

    if (existing) {
      return {
        processed: existing.status === SyncBatchStatus.COMPLETED,
        existing,
      };
    }

    return { processed: false };
  }

  /**
   * Attempts a conditional write for a transaction to ensure idempotency.
   */
  static async recordTransactionIdempotent(
    tx: Transaction
  ): Promise<{ success: boolean; duplicate: boolean; error?: string }> {
    const result = await DynamoDBAdapter.putItem<Transaction>(
      'Transactions',
      { transaction_id: tx.transaction_id },
      tx,
      'attribute_not_exists(transaction_id)'
    );

    if (!result.success) {
      return {
        success: false,
        duplicate: true,
        error: result.error,
      };
    }

    return { success: true, duplicate: false };
  }
}
