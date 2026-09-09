/**
 * SES Adapter (Stubbed)
 *
 * 🔧 AWS Setup Guide: Amazon SES
 * --------------------------------
 * 1. Open AWS Console -> SES -> Verified Identities -> Create identity
 * 2. Add and verify your sender email address
 * 3. Replace this stub implementation with `@aws-sdk/client-ses`
 */

export interface SentEmail {
  messageId: string;
  to: string;
  subject: string;
  htmlBody: string;
  sentAt: string;
}

const mockSentEmails: SentEmail[] = [];

export class SESAdapter {
  /**
   * Sends a detailed report email via SES.
   * // TODO: Replace stub with real AWS SDK SES SendEmailCommand
   */
  static async sendEmail(
    to: string,
    subject: string,
    htmlBody: string
  ): Promise<{ success: boolean; messageId: string }> {
    const messageId = `ses-msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const email: SentEmail = {
      messageId,
      to,
      subject,
      htmlBody,
      sentAt: new Date().toISOString(),
    };

    mockSentEmails.push(email);
    console.log(`[SES STUB] Email sent to ${to}: [${subject}]`);

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
