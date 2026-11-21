import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

import {
  ApiGatewayV2Client,
  CreateIntegrationCommand,
  CreateRouteCommand,
  GetIntegrationsCommand,
  GetRoutesCommand,
} from '@aws-sdk/client-apigatewayv2';
import { LambdaClient, AddPermissionCommand } from '@aws-sdk/client-lambda';

const region = env.AWS_REGION || 'us-east-1';
const credentials = {
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
};

const apigw = new ApiGatewayV2Client({ region, credentials });
const lambda = new LambdaClient({ region, credentials });

const apiId = 'krhvqkmo51';
const lambdaArn = 'arn:aws:lambda:us-east-1:319426459693:function:reconcilo-inventory-reconciliation';

async function main() {
  console.log('Connecting API Gateway', apiId, 'to Lambda...');

  // 1. Integration
  const currentInts = await apigw.send(new GetIntegrationsCommand({ ApiId: apiId }));
  let integrationId = currentInts.Items?.[0]?.IntegrationId;

  if (!integrationId) {
    console.log('Creating AWS_PROXY Lambda integration...');
    const intRes = await apigw.send(
      new CreateIntegrationCommand({
        ApiId: apiId,
        IntegrationType: 'AWS_PROXY',
        IntegrationUri: lambdaArn,
        PayloadFormatVersion: '2.0',
      })
    );
    integrationId = intRes.IntegrationId;
    console.log('✔ Integration created:', integrationId);
  } else {
    console.log('✔ Using integration:', integrationId);
  }

  // 2. Permission
  try {
    console.log('Granting Lambda invocation permission to API Gateway...');
    await lambda.send(
      new AddPermissionCommand({
        FunctionName: 'reconcilo-inventory-reconciliation',
        StatementId: 'apigateway-invoke-' + Date.now(),
        Action: 'lambda:InvokeFunction',
        Principal: 'apigateway.amazonaws.com',
        SourceArn: `arn:aws:execute-api:${region}:319426459693:${apiId}/*/*`,
      })
    );
    console.log('✔ Lambda permission granted.');
  } catch (err) {
    console.log('Notice on permission:', err.message);
  }

  // 3. Routes
  const currentRoutes = await apigw.send(new GetRoutesCommand({ ApiId: apiId }));
  const routeKeys = (currentRoutes.Items || []).map((r) => r.RouteKey);

  if (!routeKeys.includes('ANY /{proxy+}')) {
    console.log('Creating route: ANY /{proxy+}');
    await apigw.send(
      new CreateRouteCommand({
        ApiId: apiId,
        RouteKey: 'ANY /{proxy+}',
        Target: `integrations/${integrationId}`,
      })
    );
    console.log('✔ Route ANY /{proxy+} created.');
  }

  if (!routeKeys.includes('$default')) {
    console.log('Creating route: $default');
    await apigw.send(
      new CreateRouteCommand({
        ApiId: apiId,
        RouteKey: '$default',
        Target: `integrations/${integrationId}`,
      })
    );
    console.log('✔ Route $default created.');
  }

  console.log('🎉 API Gateway is completely routed to backend Lambda!');
  console.log('Live URL:', `https://${apiId}.execute-api.${region}.amazonaws.com`);
}

main().catch(console.error);
