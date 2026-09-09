import {
  ApiResponse,
  CreateTransactionRequest,
  Transaction,
  TransactionLifecycleState,
  UserRole,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';
import { TransactionValidationService } from '../services/transaction-validation.service.js';
import { IdempotencyService } from '../services/idempotency.service.js';
import { InventoryReconciliationService } from '../services/inventory-reconciliation.service.js';
import { authorizeRequest } from '../utils/auth.util.js';

export async function handler(event: any): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'GET';
  const storeId = event.pathParameters?.storeId || 'store-001';

  if (httpMethod === 'POST') {
    // RBAC: Staff, Manager, Admin allowed to create transaction
    const auth = await authorizeRequest(event, [
      UserRole.STORE_STAFF,
      UserRole.STORE_MANAGER,
      UserRole.ADMIN,
    ]);
    if (!auth.authorized) return auth.errorResponse;

    try {
      const payload: CreateTransactionRequest =
        typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

      // 1. Validation (RULE-005 - RULE-008)
      const validation = await TransactionValidationService.validate(storeId, payload);
      if (!validation.valid) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Transaction validation failed',
              details: validation.issues,
            },
          } as ApiResponse<null>),
        };
      }

      // 2. Client generated ID and transaction creation
      const transaction: Transaction = {
        transaction_id: payload.transaction_id,
        store_id: storeId,
        user_id: payload.user_id,
        device_id: payload.device_id,
        device_sequence: payload.device_sequence,
        product_id: payload.product_id,
        quantity: payload.quantity,
        unit_price: payload.unit_price,
        type: payload.type,
        lifecycle_state: TransactionLifecycleState.PENDING,
        created_at: payload.created_at,
        notes: payload.notes,
      };

      // 3. Idempotent conditional write
      const writeResult = await IdempotencyService.recordTransactionIdempotent(transaction);
      if (writeResult.duplicate) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            success: false,
            error: {
              code: 'DUPLICATE_TRANSACTION',
              message: `Transaction ${transaction.transaction_id} already exists`,
            },
          } as ApiResponse<null>),
        };
      }

      // If online direct sale, reconcile immediately
      const reconResult = await InventoryReconciliationService.reconcileTransaction(transaction);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            ...transaction,
            lifecycle_state: reconResult.lifecycle_state,
          },
        } as ApiResponse<Transaction>),
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: { code: 'SERVER_ERROR', message: err.message },
        } as ApiResponse<null>),
      };
    }
  } else if (httpMethod === 'GET') {
    // RBAC: Manager, Admin allowed per RULE-049, 050, FR-30
    const auth = await authorizeRequest(event, [
      UserRole.STORE_MANAGER,
      UserRole.ADMIN,
    ]);
    if (!auth.authorized) return auth.errorResponse;

    try {
      const transactions = await DynamoDBAdapter.queryByAttribute<Transaction>(
        'Transactions',
        'store_id',
        storeId
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            transactions,
            total: transactions.length,
          },
        }),
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: { code: 'SERVER_ERROR', message: err.message },
        } as ApiResponse<null>),
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not supported' },
    }),
  };
}
