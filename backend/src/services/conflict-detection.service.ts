import {
  Conflict,
  ConflictStatus,
  ConflictType,
  Transaction,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';

export class ConflictDetectionService {
  /**
   * Records a detected conflict in the Conflicts DynamoDB table per RULE-028, RULE-029.
   */
  static async recordConflict(params: {
    store_id: string;
    product_id: string;
    transaction_ids: string[];
    conflict_type: ConflictType;
    expected_state: number;
    actual_state: number;
    difference: number;
    resolution_notes?: string;
  }): Promise<Conflict> {
    const conflict_id = `conf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const conflict: Conflict = {
      conflict_id,
      store_id: params.store_id,
      product_id: params.product_id,
      transaction_ids: params.transaction_ids,
      conflict_type: params.conflict_type,
      expected_state: params.expected_state,
      actual_state: params.actual_state,
      difference: params.difference,
      status: ConflictStatus.OPEN,
      detected_at: new Date().toISOString(),
      resolution_notes: params.resolution_notes,
    };

    await DynamoDBAdapter.putItem<Conflict>('Conflicts', { conflict_id }, conflict);

    console.log(`[CONFLICT DETECTED] ${conflict.conflict_id} on product ${params.product_id}: expected ${params.expected_state}, actual ${params.actual_state}`);
    return conflict;
  }

  /**
   * Resolves an existing conflict per RULE-030, RULE-031.
   */
  static async resolveConflict(
    conflictId: string,
    resolvedBy: string,
    resolutionNotes: string,
    status: ConflictStatus = ConflictStatus.RESOLVED
  ): Promise<Conflict | null> {
    const existing = await DynamoDBAdapter.getItem<Conflict>('Conflicts', { conflict_id: conflictId });
    if (!existing) return null;

    const updated: Conflict = {
      ...existing,
      status,
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
      resolution_notes: resolutionNotes,
    };

    await DynamoDBAdapter.putItem<Conflict>('Conflicts', { conflict_id: conflictId }, updated);
    return updated;
  }
}
