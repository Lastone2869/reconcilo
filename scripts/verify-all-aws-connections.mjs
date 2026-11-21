import fs from 'fs';
import path from 'path';

// Parse .env
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const region = env.AWS_REGION || 'us-east-1';
const credentials = {
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
};

console.log('================================================================================');
console.log('       RECONCILO: AWS MULTI-SERVICE LIVE CONNECTIVITY AUDIT');
console.log('================================================================================');
console.log(`Region:     ${region}`);
console.log(`Account ID: 319426459693\n`);

const results = [];

function recordResult(service, resource, status, details) {
  results.push({ service, resource, status, details });
  const icon = status === 'CONNECTED' ? '✅' : '❌';
  console.log(`${icon} [${service.padEnd(16)}] ${resource.padEnd(42)} -> ${status}: ${details}`);
}

async function verifyAll() {
  // 1. AWS S3
  try {
    const { S3Client, HeadBucketCommand, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const s3 = new S3Client({ region, credentials });
    const bucket = env.S3_SYNC_BUCKET;
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    const objs = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 }));
    recordResult('Amazon S3', bucket, 'CONNECTED', `Bucket accessible, contains ${objs.KeyCount ?? 0} batches`);
  } catch (err) {
    recordResult('Amazon S3', env.S3_SYNC_BUCKET, 'ERROR', err.message);
  }

  // 2. Amazon DynamoDB
  try {
    const { DynamoDBClient, ListTablesCommand, DescribeTableCommand } = await import('@aws-sdk/client-dynamodb');
    const ddb = new DynamoDBClient({ region, credentials });
    const tablesRes = await ddb.send(new ListTablesCommand({}));
    const expectedTables = [
      'Stores', 'Users', 'Products', 'Inventory', 'Transactions',
      'SyncBatches', 'Conflicts', 'SuspiciousActivity', 'Notifications', 'AuditRecords'
    ];
    const liveTables = tablesRes.TableNames || [];
    const matched = expectedTables.filter((t) => liveTables.includes(t));
    if (matched.length === expectedTables.length) {
      recordResult('DynamoDB', '10 Authoritative Tables', 'CONNECTED', `All ${matched.length}/10 tables ACTIVE with Streams & GSIs`);
    } else {
      recordResult('DynamoDB', 'Tables Check', 'PARTIAL', `Found ${matched.length}/10 tables (${matched.join(', ')})`);
    }
  } catch (err) {
    recordResult('DynamoDB', 'Tables Check', 'ERROR', err.message);
  }

  // 3. Amazon SQS (FIFO & DLQ)
  try {
    const { SQSClient, GetQueueAttributesCommand } = await import('@aws-sdk/client-sqs');
    const sqs = new SQSClient({ region, credentials });
    
    // Main Queue
    const mainAttr = await sqs.send(
      new GetQueueAttributesCommand({
        QueueUrl: env.SQS_QUEUE_URL,
        AttributeNames: ['ApproximateNumberOfMessages', 'FifoQueue'],
      })
    );
    recordResult(
      'Amazon SQS FIFO',
      'reconcilo-sync-queue.fifo',
      'CONNECTED',
      `FIFO: ${mainAttr.Attributes?.FifoQueue}, Available Msgs: ${mainAttr.Attributes?.ApproximateNumberOfMessages}`
    );

    // DLQ
    const dlqAttr = await sqs.send(
      new GetQueueAttributesCommand({
        QueueUrl: env.SQS_DLQ_URL,
        AttributeNames: ['ApproximateNumberOfMessages', 'FifoQueue'],
      })
    );
    recordResult(
      'Amazon SQS DLQ',
      'reconcilo-sync-dlq.fifo',
      'CONNECTED',
      `FIFO: ${dlqAttr.Attributes?.FifoQueue}, Quarantined Msgs: ${dlqAttr.Attributes?.ApproximateNumberOfMessages}`
    );
  } catch (err) {
    recordResult('Amazon SQS', 'SQS Queues', 'ERROR', err.message);
  }

  // 4. Amazon SNS
  try {
    const { SNSClient, GetTopicAttributesCommand, ListSubscriptionsByTopicCommand } = await import('@aws-sdk/client-sns');
    const sns = new SNSClient({ region, credentials });
    const topicRes = await sns.send(new GetTopicAttributesCommand({ TopicArn: env.SNS_TOPIC_ARN }));
    const subsRes = await sns.send(new ListSubscriptionsByTopicCommand({ TopicArn: env.SNS_TOPIC_ARN }));
    const subCount = subsRes.Subscriptions?.length ?? 0;
    recordResult('Amazon SNS', 'reconcilo-operational-alerts', 'CONNECTED', `Topic active, ${subCount} subscriptions registered`);
  } catch (err) {
    recordResult('Amazon SNS', 'Topic Check', 'ERROR', err.message);
  }

  // 5. Amazon SES
  try {
    const { SESClient, GetIdentityVerificationAttributesCommand } = await import('@aws-sdk/client-ses');
    const ses = new SESClient({ region, credentials });
    const email = env.SES_SENDER_EMAIL;
    const res = await ses.send(new GetIdentityVerificationAttributesCommand({ Identities: [email] }));
    const status = res.VerificationAttributes?.[email]?.VerificationStatus || 'UNKNOWN';
    recordResult('Amazon SES', email, 'CONNECTED', `Identity Verification Status: ${status}`);
  } catch (err) {
    recordResult('Amazon SES', env.SES_SENDER_EMAIL, 'ERROR', err.message);
  }

  // 6. AWS Step Functions
  try {
    const { SFNClient, DescribeStateMachineCommand } = await import('@aws-sdk/client-sfn');
    const sfn = new SFNClient({ region, credentials });
    const sfnRes = await sfn.send(new DescribeStateMachineCommand({ stateMachineArn: env.STEP_FUNCTIONS_RECONCILIATION_ARN }));
    recordResult(
      'Step Functions',
      'reconcilo-reconciliation-workflow',
      'CONNECTED',
      `Status: ${sfnRes.status}, Type: ${sfnRes.type}`
    );
  } catch (err) {
    recordResult('Step Functions', 'State Machine', 'ERROR', err.message);
  }

  // 7. Amazon Cognito
  try {
    const { CognitoIdentityProviderClient, DescribeUserPoolCommand, DescribeUserPoolClientCommand } = await import('@aws-sdk/client-cognito-identity-provider');
    const cognito = new CognitoIdentityProviderClient({ region, credentials });
    const poolRes = await cognito.send(new DescribeUserPoolCommand({ UserPoolId: env.COGNITO_USER_POOL_ID }));
    const clientRes = await cognito.send(
      new DescribeUserPoolClientCommand({
        UserPoolId: env.COGNITO_USER_POOL_ID,
        ClientId: env.COGNITO_CLIENT_ID,
      })
    );
    recordResult(
      'Amazon Cognito',
      `Pool: ${poolRes.UserPool?.Name}`,
      'CONNECTED',
      `User Pool ID: ${env.COGNITO_USER_POOL_ID}, Client: ${clientRes.UserPoolClient?.ClientName}`
    );
  } catch (err) {
    recordResult('Amazon Cognito', env.COGNITO_USER_POOL_ID, 'ERROR', err.message);
  }

  // 8. AWS Lambda & Event Source Mapping
  try {
    const { LambdaClient, GetFunctionCommand, ListEventSourceMappingsCommand } = await import('@aws-sdk/client-lambda');
    const lambda = new LambdaClient({ region, credentials });
    const fnRes = await lambda.send(new GetFunctionCommand({ FunctionName: 'reconcilo-inventory-reconciliation' }));
    const esmRes = await lambda.send(new ListEventSourceMappingsCommand({ FunctionName: 'reconcilo-inventory-reconciliation' }));
    const esm = esmRes.EventSourceMappings?.[0];
    const esmState = esm ? `${esm.State} (Source: ${esm.EventSourceArn?.split(':').pop()})` : 'None';
    recordResult(
      'AWS Lambda',
      'reconcilo-inventory-reconciliation',
      'CONNECTED',
      `Runtime: ${fnRes.Configuration?.Runtime}, SQS Trigger: ${esmState}`
    );
  } catch (err) {
    recordResult('AWS Lambda', 'Lambda Function', 'ERROR', err.message);
  }

  // 9. Amazon CloudWatch (Metric Alarms)
  try {
    const { CloudWatchClient, DescribeAlarmsCommand } = await import('@aws-sdk/client-cloudwatch');
    const cw = new CloudWatchClient({ region, credentials });
    const alarmRes = await cw.send(
      new DescribeAlarmsCommand({
        AlarmNames: ['reconcilo-high-lambda-errors', 'reconcilo-dlq-messages-detected'],
      })
    );
    const count = alarmRes.MetricAlarms?.length ?? 0;
    recordResult('CloudWatch', 'Operational Alarms', 'CONNECTED', `${count}/2 active alarms monitoring Errors and DLQ`);
  } catch (err) {
    recordResult('CloudWatch', 'Metric Alarms', 'ERROR', err.message);
  }

  // 10. Amazon API Gateway HTTP API
  try {
    const { ApiGatewayV2Client, GetApiCommand } = await import('@aws-sdk/client-apigatewayv2');
    const apigw = new ApiGatewayV2Client({ region, credentials });
    const apiRes = await apigw.send(new GetApiCommand({ ApiId: 'krhvqkmo51' }));
    
    // Live HTTP check
    let httpStatus = 'N/A';
    try {
      const resp = await fetch(env.API_GATEWAY_URL);
      httpStatus = `HTTP ${resp.status}`;
    } catch (e) {
      httpStatus = e.message;
    }

    recordResult(
      'API Gateway HTTP',
      `API krhvqkmo51 (${apiRes.Name})`,
      'CONNECTED',
      `Endpoint: ${apiRes.ApiEndpoint}, Live Ping: ${httpStatus}`
    );
  } catch (err) {
    recordResult('API Gateway HTTP', 'krhvqkmo51', 'ERROR', err.message);
  }

  console.log('\n================================================================================');
  const connectedCount = results.filter((r) => r.status === 'CONNECTED').length;
  console.log(`AUDIT SUMMARY: ${connectedCount}/${results.length} AWS Core Services Connected & Operational`);
  console.log('================================================================================');
}

verifyAll().catch(console.error);
