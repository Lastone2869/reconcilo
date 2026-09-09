import {
  ApiResponse,
  SuspiciousActivity,
  ReviewSuspiciousActivityRequest,
  UserRole,
  AuditAction,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';
import { SuspiciousActivityService } from '../services/suspicious-activity.service.js';
import { AuditService } from '../services/audit.service.js';
import { authorizeRequest } from '../utils/auth.util.js';

export async function handler(event: any): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const auth = await authorizeRequest(event, [
    UserRole.STORE_MANAGER,
    UserRole.ADMIN,
  ]);
  if (!auth.authorized) return auth.errorResponse;

  const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'GET';
  const alertId = event.pathParameters?.alertId;

  if (httpMethod === 'GET') {
    try {
      const storeId = event.queryStringParameters?.storeId;
      let alerts = await DynamoDBAdapter.scanAll<SuspiciousActivity>('SuspiciousActivity');

      if (storeId) {
        alerts = alerts.filter((a) => a.store_id === storeId);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: { alerts },
        }),
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
  } else if (httpMethod === 'POST' && alertId) {
    try {
      const payload: ReviewSuspiciousActivityRequest =
        typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

      if (!payload.notes) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: { code: 'INVALID_REVIEW', message: 'notes are required' },
          } as ApiResponse<null>),
        };
      }

      const reviewed = await SuspiciousActivityService.reviewAlert(
        alertId,
        auth.context!.userId,
        `${payload.action_taken}: ${payload.notes}`
      );

      if (!reviewed) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: { code: 'NOT_FOUND', message: `Alert ${alertId} not found` },
          } as ApiResponse<null>),
        };
      }

      await AuditService.record({
        entity_type: 'SuspiciousActivity',
        entity_id: alertId,
        actor: auth.context!.userId,
        action: AuditAction.SUSPICIOUS_REVIEW,
        new_state: reviewed as any,
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: reviewed,
        } as ApiResponse<SuspiciousActivity>),
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

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Not allowed' } }),
  };
}
