/**
 * CloudWatch Adapter (Stubbed)
 *
 * 🔧 AWS Setup Guide: Amazon CloudWatch
 * --------------------------------------
 * 1. Open AWS Console -> CloudWatch
 * 2. View Log Groups under `/aws/lambda/reconcilo-*`
 * 3. Create Alarms for Lambda error rates > 5 per 5 min
 * 4. Replace this stub implementation with `@aws-sdk/client-cloudwatch`
 */

import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

export interface MetricDatum {
  namespace: string;
  metricName: string;
  value: number;
  unit?: string;
  timestamp: string;
  dimensions?: Record<string, string>;
}

const mockMetrics: MetricDatum[] = [];

let cwClient: CloudWatchClient | null = null;
function getClient(): CloudWatchClient | null {
  if (cwClient) return cwClient;
  if (process.env.AWS_ACCESS_KEY_ID && process.env.NODE_ENV !== 'test') {
    cwClient = new CloudWatchClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return cwClient;
}

export class CloudWatchAdapter {
  /**
   * Logs an operational metric to AWS CloudWatch.
   */
  static async logMetric(
    namespace: string,
    metricName: string,
    value: number,
    dimensions?: Record<string, string>
  ): Promise<boolean> {
    const datum: MetricDatum = {
      namespace,
      metricName,
      value,
      timestamp: new Date().toISOString(),
      dimensions,
    };

    mockMetrics.push(datum);

    const client = getClient();
    if (client) {
      try {
        const dimArray = dimensions
          ? Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }))
          : [];

        await client.send(
          new PutMetricDataCommand({
            Namespace: namespace,
            MetricData: [
              {
                MetricName: metricName,
                Value: value,
                Timestamp: new Date(),
                Dimensions: dimArray,
              },
            ],
          })
        );
      } catch (err: any) {
        console.warn(`[CloudWatchAdapter] Warning pushing metric: ${err.message}`);
      }
    }

    return true;
  }

  /**
   * Helper to retrieve logged metrics in test assertions.
   */
  static getLoggedMetrics(): MetricDatum[] {
    return [...mockMetrics];
  }

  /**
   * Clears mock metrics.
   */
  static resetMockMetrics(): void {
    mockMetrics.length = 0;
  }
}
