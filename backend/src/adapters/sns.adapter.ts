/**
 * SNS Adapter (Stubbed)
 *
 * 🔧 AWS Setup Guide: Amazon SNS
 * --------------------------------
 * 1. Open AWS Console -> SNS -> Create topic (Standard)
 * 2. Name: reconcilo-operational-alerts
 * 3. Create Subscription -> Email -> Confirm email
 * 4. Replace this stub implementation with `@aws-sdk/client-sns`
 */

export interface PublishedAlert {
  messageId: string;
  topicArn: string;
  subject: string;
  message: string;
  publishedAt: string;
}

const mockPublishedAlerts: PublishedAlert[] = [];

export class SNSAdapter {
  /**
   * Publishes an operational alert message to an SNS topic.
   * // TODO: Replace stub with real AWS SDK SNS PublishCommand
   */
  static async publishAlert(
    topicArn: string,
    subject: string,
    message: string
  ): Promise<{ success: boolean; messageId: string }> {
    const messageId = `sns-msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const alert: PublishedAlert = {
      messageId,
      topicArn,
      subject,
      message,
      publishedAt: new Date().toISOString(),
    };

    mockPublishedAlerts.push(alert);
    console.log(`[SNS STUB] Alert Published to ${topicArn}: [${subject}] ${message}`);

    return { success: true, messageId };
  }

  /**
   * Helper to retrieve published alerts during testing.
   */
  static getPublishedAlerts(): PublishedAlert[] {
    return [...mockPublishedAlerts];
  }

  /**
   * Clears mock published alerts.
   */
  static resetMockAlerts(): void {
    mockPublishedAlerts.length = 0;
  }
}
