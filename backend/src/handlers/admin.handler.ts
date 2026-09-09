import {
  ApiResponse,
  UpdateThresholdsRequest,
  UpdateThresholdsResponse,
  RequeueDLQResponse,
  UserRole,
  AuditAction,
  DEFAULT_SYSTEM_CONFIG,
} from '@reconcilo/shared';
import { SQSAdapter } from '../adapters/sqs.adapter.js';
import { AuditService } from '../services/audit.service.js';
import { authorizeRequest } from '../utils/auth.util.js';

let activeThresholds: Record<string, number> = {
  low_stock_default: DEFAULT_SYSTEM_CONFIG.low_stock_default_threshold,
  suspicious_quantity: DEFAULT_SYSTEM_CONFIG.suspicious_quantity_threshold,
  suspicious_repeat_count: DEFAULT_SYSTEM_CONFIG.suspicious_repeat_count_threshold,
  suspicious_time_window_minutes: DEFAULT_SYSTEM_CONFIG.suspicious_time_window_minutes,
  offline_alert_minutes: DEFAULT_SYSTEM_CONFIG.offline_alert_threshold_minutes,
};

export async function handler(event: any): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // RBAC: strictly ADMIN per rules.md RULE-050
  const auth = await authorizeRequest(event, [UserRole.ADMIN]);
  if (!auth.authorized) return auth.errorResponse;

  const path = event.path || event.rawPath || '';
  const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'POST';

  try {
    if (path.includes('/thresholds') && httpMethod === 'POST') {
      const payload: UpdateThresholdsRequest =
        typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

      const previous = { ...activeThresholds };

      if (payload.low_stock_default !== undefined) activeThresholds.low_stock_default = payload.low_stock_default;
      if (payload.suspicious_quantity !== undefined) activeThresholds.suspicious_quantity = payload.suspicious_quantity;
      if (payload.suspicious_repeat_count !== undefined) activeThresholds.suspicious_repeat_count = payload.suspicious_repeat_count;
      if (payload.suspicious_time_window_minutes !== undefined) activeThresholds.suspicious_time_window_minutes = payload.suspicious_time_window_minutes;
      if (payload.offline_alert_minutes !== undefined) activeThresholds.offline_alert_minutes = payload.offline_alert_minutes;

      await AuditService.record({
        entity_type: 'SystemConfig',
        entity_id: 'thresholds',
        actor: auth.context!.userId,
        action: AuditAction.THRESHOLD_UPDATE,
        previous_state: previous,
        new_state: activeThresholds,
      });

      const response: ApiResponse<UpdateThresholdsResponse> = {
        success: true,
        data: {
          updated: true,
          thresholds: activeThresholds,
        },
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response),
      };
    } else if (path.includes('/dlq') && httpMethod === 'POST') {
      const batchId = event.pathParameters?.batchId || 'batch-test';
      const dlqUrl = process.env.SQS_DLQ_URL || 'reconcilo-processing-dlq.fifo';
      const mainQueueUrl = process.env.SQS_QUEUE_URL || 'reconcilo-processing-queue.fifo';

      const requeueResult = await SQSAdapter.requeueFromDLQ(dlqUrl, mainQueueUrl, batchId);

      await AuditService.record({
        entity_type: 'SyncBatch',
        entity_id: batchId,
        actor: auth.context!.userId,
        action: AuditAction.DLQ_REQUEUE,
        metadata: { requeueResult },
      });

      const response: ApiResponse<RequeueDLQResponse> = {
        success: requeueResult.success,
        data: {
          success: requeueResult.success,
          batch_id: batchId,
          status: requeueResult.success ? 'REQUEUED_TO_MAIN_QUEUE' : 'NOT_FOUND_IN_DLQ',
        },
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message },
      } as ApiResponse<null>),
    };
  }
}
