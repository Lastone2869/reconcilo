import {
  NotificationRecord,
  NotificationType,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';
import { SNSAdapter } from '../adapters/sns.adapter.js';
import { SESAdapter } from '../adapters/ses.adapter.js';

export class NotificationService {
  /**
   * Sends an operational alert via SNS and records in Notifications table.
   * rules.md RULE-042, RULE-044, and FR-25.
   */
  static async sendOperationalAlert(params: {
    type: NotificationType;
    subject: string;
    message: string;
    relatedEventId?: string;
    recipientTopicArn?: string;
  }): Promise<NotificationRecord> {
    const topicArn =
      params.recipientTopicArn ||
      'arn:aws:sns:us-east-1:123456789012:reconcilo-operational-alerts';

    await SNSAdapter.publishAlert(topicArn, params.subject, params.message);

    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record: NotificationRecord = {
      notification_id: notificationId,
      type: params.type,
      recipient: topicArn,
      subject: params.subject,
      body: params.message,
      related_event_id: params.relatedEventId,
      status: 'SENT',
      created_at: new Date().toISOString(),
    };

    await DynamoDBAdapter.putItem('Notifications', { notification_id: notificationId }, record);
    return record;
  }

  /**
   * Sends a detailed HTML report email via SES.
   */
  static async sendDetailedReport(params: {
    to: string;
    subject: string;
    htmlBody: string;
    relatedEventId?: string;
  }): Promise<NotificationRecord> {
    await SESAdapter.sendEmail(params.to, params.subject, params.htmlBody);

    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record: NotificationRecord = {
      notification_id: notificationId,
      type: NotificationType.RECONCILIATION_REPORT,
      recipient: params.to,
      subject: params.subject,
      body: params.htmlBody,
      related_event_id: params.relatedEventId,
      status: 'SENT',
      created_at: new Date().toISOString(),
    };

    await DynamoDBAdapter.putItem('Notifications', { notification_id: notificationId }, record);
    return record;
  }
}
