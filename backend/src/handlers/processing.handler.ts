import {
  SyncBatch,
  SyncBatchStatus,
  Transaction,
  Store,
  StoreConnectivityState,
} from '@reconcilo/shared';
import { S3Adapter } from '../adapters/s3.adapter.js';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';
import { StepFunctionsAdapter } from '../adapters/stepfunctions.adapter.js';
import { TransactionReplayService } from '../services/transaction-replay.service.js';

export async function handler(event: any): Promise<{ statusCode: number; body: string }> {
  console.log('[PROCESSING LAMBDA] SQS FIFO message received:', JSON.stringify(event));

  try {
    const records = event.Records || [{ body: typeof event.body === 'string' ? event.body : JSON.stringify(event.body || event) }];

    for (const record of records) {
      const payload = typeof record.body === 'string' ? JSON.parse(record.body) : record.body;
      const { batch_id, store_id, s3_bucket, s3_key } = payload;

      if (!batch_id) continue;

      // 1. Mark batch as PROCESSING
      const existingBatch = await DynamoDBAdapter.getItem<SyncBatch>('SyncBatches', { batch_id });
      if (existingBatch) {
        await DynamoDBAdapter.putItem('SyncBatches', { batch_id }, {
          ...existingBatch,
          status: SyncBatchStatus.PROCESSING,
          last_attempt_at: new Date().toISOString(),
        });
      }

      // 2. Fetch batch contents from S3
      const batchData = await S3Adapter.getBatch<{ transactions: Transaction[] }>(s3_bucket, s3_key);
      const transactions = batchData?.transactions || [];

      // 3. Kick off Step Functions workflow (or execute replay directly in stub mode)
      const stateMachineArn =
        process.env.STEP_FUNCTIONS_ARN ||
        'arn:aws:states:us-east-1:123456789012:stateMachine:reconcilo-reconciliation-workflow';

      await StepFunctionsAdapter.startExecution(stateMachineArn, {
        batch_id,
        store_id,
        transaction_count: transactions.length,
      });

      // 4. Deterministic sequential replay
      const replayResult = await TransactionReplayService.replayBatch(
        batch_id,
        store_id,
        transactions
      );

      // 5. Update batch status to COMPLETED
      if (existingBatch) {
        await DynamoDBAdapter.putItem('SyncBatches', { batch_id }, {
          ...existingBatch,
          status: SyncBatchStatus.COMPLETED,
          completed_at: new Date().toISOString(),
        });
      }

      // 6. Update store connectivity & last successful sync
      const store = await DynamoDBAdapter.getItem<Store>('Stores', { store_id });
      if (store) {
        await DynamoDBAdapter.putItem('Stores', { store_id }, {
          ...store,
          connectivity_state: StoreConnectivityState.ONLINE,
          last_successful_sync: new Date().toISOString(),
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Batch processed successfully' }),
    };
  } catch (err: any) {
    console.error('[PROCESSING ERROR]', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}
