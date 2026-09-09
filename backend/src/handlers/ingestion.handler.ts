import { SyncBatch, SyncBatchStatus } from '@reconcilo/shared';
import { SQSAdapter } from '../adapters/sqs.adapter.js';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';

export async function handler(event: any): Promise<{ statusCode: number; body: string }> {
  console.log('[INGESTION LAMBDA] S3 Event received:', JSON.stringify(event));

  try {
    let bucket = 'reconcilo-sync-batches';
    let key = '';

    // Check if event is an S3 Event Notification
    if (event.Records && event.Records[0]?.s3) {
      const record = event.Records[0];
      bucket = record.s3.bucket.name;
      key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    } else if (event.bucket && event.key) {
      bucket = event.bucket;
      key = event.key;
    }

    // Extract batch_id and store_id from key or payload
    // Key pattern: `transactions/{store_id}/{batch_id}.json`
    const keyParts = key.split('/');
    const storeId = keyParts.length > 2 ? keyParts[1] : (event.store_id || 'store-001');
    const batchId = keyParts.length > 2 ? keyParts[2].replace('.json', '') : (event.batch_id || `batch-${Date.now()}`);

    const queueUrl = process.env.SQS_QUEUE_URL || 'https://sqs.us-east-1.amazonaws.com/123456789012/reconcilo-processing-queue.fifo';

    const messagePayload = {
      batch_id: batchId,
      store_id: storeId,
      s3_bucket: bucket,
      s3_key: key,
    };

    // Forward to SQS FIFO serialized by MessageGroupId = store_id per architecture.md §4.2
    await SQSAdapter.sendMessage(
      queueUrl,
      messagePayload,
      storeId, // MessageGroupId: guarantees per-store serialization
      batchId  // MessageDeduplicationId: idempotent deduplication
    );

    // Update batch status to QUEUED
    const existingBatch = await DynamoDBAdapter.getItem<SyncBatch>('SyncBatches', { batch_id: batchId });
    if (existingBatch) {
      await DynamoDBAdapter.putItem('SyncBatches', { batch_id: batchId }, {
        ...existingBatch,
        status: SyncBatchStatus.QUEUED,
        last_attempt_at: new Date().toISOString(),
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Batch ${batchId} forwarded to SQS FIFO for store ${storeId}`,
      }),
    };
  } catch (err: any) {
    console.error('[INGESTION ERROR]', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}
