import {
  ApiResponse,
  CreateSyncBatchRequest,
  GetSyncStatusResponse,
  SyncBatch,
  SyncBatchStatus,
  Store,
  StoreConnectivityState,
  UserRole,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';
import { S3Adapter } from '../adapters/s3.adapter.js';
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

  const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'GET';
  const storeId = event.pathParameters?.storeId || 'store-001';

  if (httpMethod === 'POST') {
    const auth = await authorizeRequest(event, [
      UserRole.STORE_STAFF,
      UserRole.STORE_MANAGER,
      UserRole.ADMIN,
    ]);
    if (!auth.authorized) return auth.errorResponse;

    try {
      const payload: CreateSyncBatchRequest =
        typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

      if (!payload.batch_id || !payload.s3_key) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: { code: 'INVALID_BATCH', message: 'batch_id and s3_key are required' },
          } as ApiResponse<null>),
        };
      }

      // Guarantee 1 & Guarantee 3: Idempotent batch registration in DynamoDB
      const existing = await DynamoDBAdapter.getItem<SyncBatch>('SyncBatches', {
        batch_id: payload.batch_id,
      });

      if (existing) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: existing,
          } as ApiResponse<SyncBatch>),
        };
      }

      // Save batch JSON to S3 via adapter
      await S3Adapter.uploadBatch(
        payload.s3_bucket || 'reconcilo-sync-batches',
        payload.s3_key,
        payload
      );

      const syncBatch: SyncBatch = {
        batch_id: payload.batch_id,
        store_id: storeId,
        device_id: payload.device_id,
        s3_bucket: payload.s3_bucket || 'reconcilo-sync-batches',
        s3_key: payload.s3_key,
        transaction_count: payload.transaction_count,
        status: SyncBatchStatus.UPLOADED,
        retry_count: 0,
        uploaded_at: new Date().toISOString(),
        last_attempt_at: new Date().toISOString(),
      };

      await DynamoDBAdapter.putItem('SyncBatches', { batch_id: syncBatch.batch_id }, syncBatch);

      // Update store last_sync_attempt
      const store = await DynamoDBAdapter.getItem<Store>('Stores', { store_id: storeId });
      if (store) {
        await DynamoDBAdapter.putItem('Stores', { store_id: storeId }, {
          ...store,
          last_sync_attempt: new Date().toISOString(),
          connectivity_state: StoreConnectivityState.SYNCING,
        });
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          data: syncBatch,
        } as ApiResponse<SyncBatch>),
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
  } else if (httpMethod === 'GET') {
    const auth = await authorizeRequest(event, [
      UserRole.STORE_STAFF,
      UserRole.STORE_MANAGER,
      UserRole.ADMIN,
    ]);
    if (!auth.authorized) return auth.errorResponse;

    try {
      const store = await DynamoDBAdapter.getItem<Store>('Stores', { store_id: storeId });
      const batches = await DynamoDBAdapter.queryByAttribute<SyncBatch>(
        'SyncBatches',
        'store_id',
        storeId
      );

      const pendingBatches = batches.filter(
        (b) => b.status === SyncBatchStatus.UPLOADED || b.status === SyncBatchStatus.QUEUED
      ).length;

      const latestBatch = batches.sort(
        (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      )[0];

      const response: ApiResponse<GetSyncStatusResponse> = {
        success: true,
        data: {
          store_id: storeId,
          connectivity_state: store?.connectivity_state || StoreConnectivityState.ONLINE,
          last_successful_sync: store?.last_successful_sync || new Date().toISOString(),
          last_sync_attempt: store?.last_sync_attempt || new Date().toISOString(),
          pending_batches: pendingBatches,
          latest_batch: latestBatch,
        },
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response),
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
