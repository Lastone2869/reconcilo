import {
  AuditRecord,
  AuditAction,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';

export class AuditService {
  /**
   * Records an immutable append-only audit event in the AuditRecords DynamoDB table.
   * rules.md RULE-052 and RULE-053.
   */
  static async record(params: {
    entity_type: string;
    entity_id: string;
    actor: string;
    action: AuditAction;
    previous_state?: Record<string, unknown> | null;
    new_state?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
  }): Promise<AuditRecord> {
    const audit_id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const created_at = new Date().toISOString();

    const record: AuditRecord = {
      audit_id,
      created_at,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      actor: params.actor,
      action: params.action,
      previous_state: params.previous_state,
      new_state: params.new_state,
      metadata: params.metadata,
    };

    await DynamoDBAdapter.putItem('AuditRecords', { audit_id, created_at }, record);
    return record;
  }

  /**
   * Retrieves audit history for an entity.
   */
  static async getEntityAuditHistory(entityId: string): Promise<AuditRecord[]> {
    return DynamoDBAdapter.queryByAttribute<AuditRecord>('AuditRecords', 'entity_id', entityId);
  }
}
