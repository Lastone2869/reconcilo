/**
 * SQS Adapter (Stubbed)
 *
 * 🔧 AWS Setup Guide: Amazon SQS (FIFO Queue + Dead Letter Queue)
 * -----------------------------------------------------------------
 * 1. Open AWS Console -> SQS -> Create queue
 * 2. Type: FIFO Queue
 * 3. Queue 1: reconcilo-processing-dlq.fifo
 * 4. Queue 2: reconcilo-processing-queue.fifo (DLQ redrive: 3 max receives -> DLQ)
 * 5. Replace this stub implementation with `@aws-sdk/client-sqs`
 */

export interface SQSMessage {
  MessageId: string;
  ReceiptHandle: string;
  Body: string;
  MessageGroupId?: string;
  MessageDeduplicationId?: string;
}

const mockMainQueue: SQSMessage[] = [];
const mockDLQ: SQSMessage[] = [];

export class SQSAdapter {
  /**
   * Sends a message to a FIFO queue with MessageGroupId (store_id) and MessageDeduplicationId (batch_id).
   * // TODO: Replace stub with real AWS SDK SQS SendMessageCommand
   */
  static async sendMessage(
    queueUrl: string,
    body: Record<string, any> | string,
    messageGroupId: string,
    deduplicationId: string
  ): Promise<{ success: boolean; messageId: string }> {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const payload = typeof body === 'string' ? body : JSON.stringify(body);

    const message: SQSMessage = {
      MessageId: messageId,
      ReceiptHandle: `receipt-${messageId}`,
      Body: payload,
      MessageGroupId: messageGroupId,
      MessageDeduplicationId: deduplicationId,
    };

    if (queueUrl.includes('dlq')) {
      mockDLQ.push(message);
    } else {
      mockMainQueue.push(message);
    }

    return { success: true, messageId };
  }

  /**
   * Deletes a processed message from SQS queue.
   * // TODO: Replace stub with real AWS SDK SQS DeleteMessageCommand
   */
  static async deleteMessage(queueUrl: string, receiptHandle: string): Promise<boolean> {
    const queue = queueUrl.includes('dlq') ? mockDLQ : mockMainQueue;
    const index = queue.findIndex((m) => m.ReceiptHandle === receiptHandle);
    if (index !== -1) {
      queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Requeues a message from DLQ back to the main queue (FR-29).
   * // TODO: Replace stub with real AWS SDK SQS batch receive/send
   */
  static async requeueFromDLQ(
    dlqUrl: string,
    mainQueueUrl: string,
    messageId: string
  ): Promise<{ success: boolean; requeuedId?: string }> {
    const index = mockDLQ.findIndex((m) => m.MessageId === messageId);
    if (index === -1) {
      return { success: false };
    }

    const [msg] = mockDLQ.splice(index, 1);
    mockMainQueue.push({
      ...msg,
      ReceiptHandle: `receipt-requeued-${Date.now()}`,
    });

    return { success: true, requeuedId: msg.MessageId };
  }

  /**
   * Retrieves messages from mock queue (for tests & processing simulation).
   */
  static getMockQueueMessages(isDLQ = false): SQSMessage[] {
    return isDLQ ? [...mockDLQ] : [...mockMainQueue];
  }

  /**
   * Clears mock queues.
   */
  static resetMockQueues(): void {
    mockMainQueue.length = 0;
    mockDLQ.length = 0;
  }
}
