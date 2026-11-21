import {
  ApiResponse,
  CreateEODRollupRequest,
  CreateEODRollupResponse,
  GetEODRollupsResponse,
  UserRole,
} from '@reconcilo/shared';
import { EODRollupService } from '../services/eod-rollup.service.js';
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

  // 1. Scheduled CloudWatch Events Trigger (cron)
  if (event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event') {
    console.log('[EODRollupHandler] Executing scheduled CloudWatch Events midnight fleetwide rollup...');
    const result = await EODRollupService.executeFleetwideEODRollup();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Midnight fleetwide rollup processed for ${result.storesProcessed} stores.`,
        data: result,
      }),
    };
  }

  // 2. HTTP API Gateway Request: Requires STORE_MANAGER or ADMIN role per RULE-049/050
  const auth = await authorizeRequest(event, [UserRole.STORE_MANAGER, UserRole.ADMIN]);
  if (!auth.authorized) return auth.errorResponse;

  const path = event.path || event.rawPath || '';
  const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'GET';

  try {
    // POST /reports/eod-rollup — Manual / On-demand Shift Rollup Settlement
    if (httpMethod === 'POST') {
      const payload: CreateEODRollupRequest =
        typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};

      const storeId = payload.store_id || auth.context?.storeId || 'store-001';

      const report = await EODRollupService.generateRollup({
        store_id: storeId,
        date: payload.date,
        opening_cash: payload.opening_cash,
        actual_physical_cash: payload.actual_physical_cash,
        actor: auth.context?.userId || 'STORE_MANAGER',
        notes: payload.notes,
      });

      const response: ApiResponse<CreateEODRollupResponse> = {
        success: true,
        data: report,
      };

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(response),
      };
    }

    // GET /reports/eod-rollups — Query Historical Rollup Reports
    if (httpMethod === 'GET') {
      const query = event.queryStringParameters || {};
      const storeId = query.storeId || auth.context?.storeId;
      const date = query.date;

      const rollups = await EODRollupService.getRollups(storeId, date);

      const response: ApiResponse<GetEODRollupsResponse> = {
        success: true,
        data: { rollups },
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
      body: JSON.stringify({ success: false, error: { code: 'NotFound', message: 'Route not found' } }),
    };
  } catch (err: any) {
    console.error('[EODRollupHandler] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: { code: 'InternalError', message: err.message },
      }),
    };
  }
}
