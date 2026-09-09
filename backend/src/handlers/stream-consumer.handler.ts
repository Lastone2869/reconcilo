import {
  WebSocketMessage,
  StoreConnectivityState,
  ConflictStatus,
  SuspiciousActivityStatus,
  SyncBatchStatus,
} from '@reconcilo/shared';
import { LowStockService } from '../services/low-stock.service.js';

export async function handler(event: any): Promise<{ statusCode: number; body: string }> {
  console.log('[DYNAMODB STREAM CONSUMER] Records received:', event.Records?.length || 0);

  const messagesToBroadcast: WebSocketMessage[] = [];

  try {
    const records = event.Records || [];

    for (const record of records) {
      const eventName = record.eventName; // INSERT, MODIFY, REMOVE
      const tableName = record.eventSourceARN?.split('/')[1] || '';
      const newImage = record.dynamodb?.NewImage;

      if (!newImage) continue;

      if (tableName.includes('Inventory') && (eventName === 'INSERT' || eventName === 'MODIFY')) {
        const storeId = newImage.store_id?.S || newImage.store_id;
        const productId = newImage.product_id?.S || newImage.product_id;
        const quantity = parseInt(newImage.quantity?.N || newImage.quantity || '0', 10);
        const version = parseInt(newImage.version?.N || newImage.version || '1', 10);
        const status = newImage.status?.S || newImage.status || 'IN_STOCK';

        messagesToBroadcast.push({
          type: 'inventory.updated',
          timestamp: new Date().toISOString(),
          data: {
            store_id: storeId,
            product_id: productId,
            quantity,
            version,
            status,
          },
        });

        // Evaluate low-stock check per RULE-024
        await LowStockService.checkAndAlert({
          storeId,
          productId,
          productName: productId,
          currentQuantity: quantity,
          threshold: 10,
        });
      } else if (tableName.includes('Conflicts') && eventName === 'INSERT') {
        const conflictId = newImage.conflict_id?.S || newImage.conflict_id;
        const storeId = newImage.store_id?.S || newImage.store_id;
        const productId = newImage.product_id?.S || newImage.product_id;
        const conflictType = newImage.conflict_type?.S || newImage.conflict_type || 'OVERSOLD';
        const diff = parseInt(newImage.difference?.N || newImage.difference || '0', 10);
        const status = (newImage.status?.S || newImage.status || 'OPEN') as ConflictStatus;

        messagesToBroadcast.push({
          type: 'conflict.created',
          timestamp: new Date().toISOString(),
          data: {
            conflict_id: conflictId,
            store_id: storeId,
            product_id: productId,
            conflict_type: conflictType,
            difference: diff,
            status,
          },
        });
      } else if (tableName.includes('SuspiciousActivity') && eventName === 'INSERT') {
        const alertId = newImage.alert_id?.S || newImage.alert_id;
        const storeId = newImage.store_id?.S || newImage.store_id;
        const triggeredRule = newImage.triggered_rule?.S || newImage.triggered_rule || '';
        const actualValue = parseInt(newImage.actual_value?.N || newImage.actual_value || '0', 10);
        const status = (newImage.status?.S || newImage.status || 'FLAGGED') as SuspiciousActivityStatus;

        messagesToBroadcast.push({
          type: 'suspicious_activity.flagged',
          timestamp: new Date().toISOString(),
          data: {
            alert_id: alertId,
            store_id: storeId,
            triggered_rule: triggeredRule,
            actual_value: actualValue,
            status,
          },
        });
      } else if (tableName.includes('Stores') && eventName === 'MODIFY') {
        const storeId = newImage.store_id?.S || newImage.store_id;
        const connState = (newImage.connectivity_state?.S || newImage.connectivity_state || 'ONLINE') as StoreConnectivityState;
        const lastSync = newImage.last_successful_sync?.S || newImage.last_successful_sync || new Date().toISOString();

        messagesToBroadcast.push({
          type: 'store.connectivity_changed',
          timestamp: new Date().toISOString(),
          data: {
            store_id: storeId,
            connectivity_state: connState,
            last_successful_sync: lastSync,
          },
        });
      } else if (tableName.includes('SyncBatches') && eventName === 'MODIFY') {
        const batchId = newImage.batch_id?.S || newImage.batch_id;
        const storeId = newImage.store_id?.S || newImage.store_id;
        const status = (newImage.status?.S || newImage.status || 'PROCESSING') as SyncBatchStatus;
        const txCount = parseInt(newImage.transaction_count?.N || newImage.transaction_count || '0', 10);

        messagesToBroadcast.push({
          type: 'sync_batch.status_changed',
          timestamp: new Date().toISOString(),
          data: {
            batch_id: batchId,
            store_id: storeId,
            status,
            transaction_count: txCount,
          },
        });
      }
    }

    console.log(`[DYNAMODB STREAM CONSUMER] Broadcasted ${messagesToBroadcast.length} messages`);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, count: messagesToBroadcast.length }),
    };
  } catch (err: any) {
    console.error('[STREAM CONSUMER ERROR]', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}
