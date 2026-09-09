import { CreateTransactionRequest } from '../types/api.js';

export interface ValidationIssue {
  field: string;
  rule: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * Validates a transaction request against rules.md RULE-005, RULE-006, RULE-007, RULE-008.
 */
export function validateTransactionRequest(
  tx: Partial<CreateTransactionRequest>
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // RULE-005: Field presence validation
  if (!tx.transaction_id || tx.transaction_id.trim() === '') {
    issues.push({
      field: 'transaction_id',
      rule: 'RULE-005',
      message: 'transaction_id is required',
    });
  }

  if (!tx.user_id || tx.user_id.trim() === '') {
    issues.push({
      field: 'user_id',
      rule: 'RULE-005',
      message: 'user_id is required',
    });
  }

  if (!tx.device_id || tx.device_id.trim() === '') {
    issues.push({
      field: 'device_id',
      rule: 'RULE-005',
      message: 'device_id is required',
    });
  }

  if (tx.device_sequence === undefined || tx.device_sequence === null || tx.device_sequence < 1) {
    issues.push({
      field: 'device_sequence',
      rule: 'RULE-005',
      message: 'device_sequence must be a positive integer',
    });
  }

  if (!tx.product_id || tx.product_id.trim() === '') {
    issues.push({
      field: 'product_id',
      rule: 'RULE-005',
      message: 'product_id is required',
    });
  }

  if (!tx.created_at || isNaN(Date.parse(tx.created_at))) {
    issues.push({
      field: 'created_at',
      rule: 'RULE-005',
      message: 'created_at must be a valid ISO timestamp',
    });
  }

  if (!tx.type) {
    issues.push({
      field: 'type',
      rule: 'RULE-005',
      message: 'type is required',
    });
  }

  // RULE-006: Quantity validation
  if (tx.quantity === undefined || tx.quantity === null || typeof tx.quantity !== 'number' || isNaN(tx.quantity)) {
    issues.push({
      field: 'quantity',
      rule: 'RULE-006',
      message: 'quantity must be a valid number',
    });
  } else if (tx.quantity <= 0) {
    issues.push({
      field: 'quantity',
      rule: 'RULE-006',
      message: 'quantity must be greater than zero',
    });
  }

  if (tx.unit_price !== undefined && (typeof tx.unit_price !== 'number' || tx.unit_price < 0)) {
    issues.push({
      field: 'unit_price',
      rule: 'RULE-006',
      message: 'unit_price must be a non-negative number',
    });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
