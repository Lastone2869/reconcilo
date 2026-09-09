import { NotificationType } from '@reconcilo/shared';
import { SNSAdapter } from '../adapters/sns.adapter.js';

export class LowStockService {
  /**
   * Evaluates inventory quantity against product threshold and emits SNS alert if low.
   * rules.md RULE-024 and FR-14.
   */
  static async checkAndAlert(params: {
    storeId: string;
    productId: string;
    productName: string;
    currentQuantity: number;
    threshold: number;
  }): Promise<{ isLowStock: boolean; alertSent: boolean }> {
    if (params.currentQuantity <= params.threshold) {
      const subject = `[LOW STOCK ALERT] Store: ${params.storeId} Product: ${params.productName}`;
      const message = `Product '${params.productName}' (${params.productId}) has reached ${params.currentQuantity} units (threshold: ${params.threshold}) in store '${params.storeId}'. Please trigger reorder.`;

      await SNSAdapter.publishAlert(
        'arn:aws:sns:us-east-1:123456789012:reconcilo-operational-alerts',
        subject,
        message
      );

      return { isLowStock: true, alertSent: true };
    }

    return { isLowStock: false, alertSent: false };
  }
}
