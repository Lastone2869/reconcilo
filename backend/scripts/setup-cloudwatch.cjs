const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.substring(0, idx).trim(), l.substring(idx + 1).trim()];
    })
);

const {
  CloudWatchClient,
  PutMetricAlarmCommand,
  DescribeAlarmsCommand,
} = require('@aws-sdk/client-cloudwatch');

const region = env.AWS_REGION || 'us-east-1';
const credentials = {
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
};

const cw = new CloudWatchClient({ region, credentials });
const snsTopicArn = env.SNS_TOPIC_ARN;

async function setupCloudWatch() {
  console.log('--- PROVISIONING AMAZON CLOUDWATCH METRIC ALARMS ---');

  // Alarm 1: Lambda High Errors
  const lambdaAlarmName = 'reconcilo-high-lambda-errors';
  console.log(`Creating alarm "${lambdaAlarmName}"...`);
  await cw.send(
    new PutMetricAlarmCommand({
      AlarmName: lambdaAlarmName,
      AlarmDescription: 'Alerts when Lambda reconciliation error count exceeds 5 within 5 minutes',
      MetricName: 'Errors',
      Namespace: 'AWS/Lambda',
      Statistic: 'Sum',
      Period: 300,
      EvaluationPeriods: 1,
      Threshold: 5,
      ComparisonOperator: 'GreaterThanThreshold',
      Dimensions: [
        {
          Name: 'FunctionName',
          Value: 'reconcilo-inventory-reconciliation',
        },
      ],
      AlarmActions: snsTopicArn ? [snsTopicArn] : [],
      TreatMissingData: 'notBreaching',
    })
  );
  console.log(`✔ Alarm "${lambdaAlarmName}" created.`);

  // Alarm 2: SQS DLQ Messages (Sync Quarantine)
  const dlqAlarmName = 'reconcilo-dlq-messages-detected';
  console.log(`Creating alarm "${dlqAlarmName}"...`);
  await cw.send(
    new PutMetricAlarmCommand({
      AlarmName: dlqAlarmName,
      AlarmDescription: 'Alerts immediately when any failed transaction batches arrive in the DLQ',
      MetricName: 'ApproximateNumberOfMessagesVisible',
      Namespace: 'AWS/SQS',
      Statistic: 'Maximum',
      Period: 60,
      EvaluationPeriods: 1,
      Threshold: 1,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      Dimensions: [
        {
          Name: 'QueueName',
          Value: 'reconcilo-sync-dlq.fifo',
        },
      ],
      AlarmActions: snsTopicArn ? [snsTopicArn] : [],
      TreatMissingData: 'notBreaching',
    })
  );
  console.log(`✔ Alarm "${dlqAlarmName}" created.`);

  // Verify
  const alarms = await cw.send(
    new DescribeAlarmsCommand({
      AlarmNames: [lambdaAlarmName, dlqAlarmName],
    })
  );
  console.log('\nVerified Active Alarms:');
  for (const a of alarms.MetricAlarms || []) {
    console.log(`• ${a.AlarmName} [${a.StateValue}] -> Metric: ${a.Namespace}/${a.MetricName}`);
  }
}

setupCloudWatch().catch(console.error);
