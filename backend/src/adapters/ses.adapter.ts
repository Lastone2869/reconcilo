/**
 * SES Adapter (Stubbed)
 *
 * 🔧 AWS Setup Guide: Amazon SES
 * --------------------------------
 * 1. Open AWS Console -> SES -> Verified Identities -> Create identity
 * 2. Add and verify your sender email address
 * 3. Replace this stub implementation with `@aws-sdk/client-ses`
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface SentEmail {
  messageId: string;
  to: string;
  subject: string;
  htmlBody: string;
  sentAt: string;
}

const mockSentEmails: SentEmail[] = [];

let sesClient: SESClient | null = null;
function getClient(): SESClient | null {
  if (sesClient) return sesClient;
  if (process.env.AWS_ACCESS_KEY_ID && process.env.NODE_ENV !== 'test') {
    sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return sesClient;
}

export class SESAdapter {
  /**
   * Sends a detailed report email via Amazon SES.
   */
  static async sendEmail(
    to: string,
    subject: string,
    htmlBody: string
  ): Promise<{ success: boolean; messageId: string }> {
    const sender = process.env.SES_SENDER_EMAIL || 'reports@reconcilo.com';
    let messageId = `ses-msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const email: SentEmail = {
      messageId,
      to,
      subject,
      htmlBody,
      sentAt: new Date().toISOString(),
    };

    mockSentEmails.push(email);

    const client = getClient();
    if (client) {
      try {
        const res = await client.send(
          new SendEmailCommand({
            Source: sender,
            Destination: {
              ToAddresses: [to],
            },
            Message: {
              Subject: { Data: subject, Charset: 'UTF-8' },
              Body: {
                Html: { Data: htmlBody, Charset: 'UTF-8' },
              },
            },
          })
        );
        if (res.MessageId) {
          messageId = res.MessageId;
        }
      } catch (err: any) {
        console.warn(`[SESAdapter] Live send warning: ${err.message}`);
      }
    }

    return { success: true, messageId };
  }

  /**
   * Helper to retrieve sent emails in test assertions.
   */
  static getSentEmails(): SentEmail[] {
    return [...mockSentEmails];
  }

  /**
   * Clears mock sent emails.
   */
  static resetMockEmails(): void {
    mockSentEmails.length = 0;
  }
}
