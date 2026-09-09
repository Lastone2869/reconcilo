import {
  ApiResponse,
  Conflict,
  ConflictStatus,
  ResolveConflictRequest,
  UserRole,
  AuditAction,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';
import { ConflictDetectionService } from '../services/conflict-detection.service.js';
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

  // RBAC: Manager, Admin allowed per RULE-030, 049, 050
  const auth = await authorizeRequest(event, [
    UserRole.STORE_MANAGER,
    UserRole.ADMIN,
  ]);
  if (!auth.authorized) return auth.errorResponse;

  const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'GET';
  const conflictId = event.pathParameters?.conflictId;

  if (httpMethod === 'GET') {
    try {
      const storeId = event.queryStringParameters?.storeId;
      let conflicts = await DynamoDBAdapter.scanAll<Conflict>('Conflicts');

      if (storeId) {
        conflicts = conflicts.filter((c) => c.store_id === storeId);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: { conflicts },
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
  } else if (httpMethod === 'POST' && conflictId) {
    try {
      const payload: ResolveConflictRequest =
        typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

      if (!payload.resolution || !payload.notes) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: { code: 'INVALID_RESOLUTION', message: 'resolution and notes are required' },
          } as ApiResponse<null>),
        };
      }

      const resolved = await ConflictDetectionService.resolveConflict(
        conflictId,
        auth.context!.userId,
        `${payload.resolution}: ${payload.notes}`,
        ConflictStatus.RESOLVED
      );

      if (!resolved) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: { code: 'NOT_FOUND', message: `Conflict ${conflictId} not found` },
          } as ApiResponse<null>),
        };
      }

      // Record audit per RULE-052
      await AuditService.record({
        entity_type: 'Conflict',
        entity_id: conflictId,
        actor: auth.context!.userId,
        action: AuditAction.CONFLICT_RESOLVE,
        new_state: resolved as any,
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: resolved,
        } as ApiResponse<Conflict>),
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
