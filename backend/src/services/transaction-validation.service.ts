import {
  CreateTransactionRequest,
  validateTransactionRequest,
  ValidationResult,
  Product,
  Store,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';

export interface ExtendedValidationResult extends ValidationResult {
  product?: Product;
  store?: Store;
}

export class TransactionValidationService {
  /**
   * Validates a transaction request according to rules.md RULE-005, RULE-006, RULE-007, RULE-008.
   */
  static async validate(
    storeId: string,
    tx: CreateTransactionRequest
  ): Promise<ExtendedValidationResult> {
    // 1. Basic schema & format validation (RULE-005, RULE-006)
    const baseValidation = validateTransactionRequest(tx);
    const issues = [...baseValidation.issues];

    // Check storeId in URL matches or is provided
    if (!storeId || storeId.trim() === '') {
      issues.push({
        field: 'store_id',
        rule: 'RULE-005',
        message: 'store_id is required',
      });
    }

    // 2. Validate product exists (RULE-007)
    let product: Product | null = null;
    if (tx.product_id) {
      product = await DynamoDBAdapter.getItem<Product>('Products', { product_id: tx.product_id });
      if (!product) {
        issues.push({
          field: 'product_id',
          rule: 'RULE-007',
          message: `Product '${tx.product_id}' does not exist in the catalog`,
        });
      }
    }

    // 3. Validate store exists and is valid (RULE-008)
    let store: Store | null = null;
    if (storeId) {
      store = await DynamoDBAdapter.getItem<Store>('Stores', { store_id: storeId });
      if (!store) {
        issues.push({
          field: 'store_id',
          rule: 'RULE-008',
          message: `Store '${storeId}' does not exist`,
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      product: product || undefined,
      store: store || undefined,
    };
  }
}
