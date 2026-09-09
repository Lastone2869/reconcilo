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

export interface MetricDatum {
  namespace: string;
  metricName: string;
  value: number;
  unit?: string;
  timestamp: string;
  dimensions?: Record<string, string>;
}

const mockMetrics: MetricDatum[] = [];

export class CloudWatchAdapter {
  /**
   * Logs a custom operational metric to CloudWatch.
   * // TODO: Replace stub with real AWS SDK CloudWatch PutMetricDataCommand
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
    console.log(`[CLOUDWATCH STUB] Metric logged [${namespace}] ${metricName}: ${value}`);
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
