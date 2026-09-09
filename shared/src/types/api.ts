import {
  Transaction,
  Inventory,
  Conflict,
  SuspiciousActivity,
  SyncBatch,
  Store,
} from './entities.js';
import {
  TransactionType,
  ConflictStatus,
  SuspiciousActivityStatus,
  UserRole,
} from './enums.js';

// Generic API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// POST /auth/login
export interface LoginRequest {
  email: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    user_id: string;
    email: string;
    name: string;
    role: UserRole;
    store_id?: string | null;
  };
}

// GET /stores/{storeId}/inventory
export interface GetInventoryResponse {
  store_id: string;
  items: Array<Inventory & { product_name: string; sku: string; unit_price: number }>;
}

// POST /stores/{storeId}/transactions
export interface CreateTransactionRequest {
  transaction_id: string;
  user_id: string;
  device_id: string;
  device_sequence: number;
  product_id: string;
  quantity: number;
  unit_price: number;
  type: TransactionType;
  created_at: string;
  notes?: string;
}

export type CreateTransactionResponse = Transaction;

// GET /stores/{storeId}/transactions
export interface GetTransactionsQuery {
  startDate?: string;
  endDate?: string;
  status?: string;
  productId?: string;
  limit?: number;
}

export interface GetTransactionsResponse {
  transactions: Transaction[];
  total: number;
}

// POST /stores/{storeId}/sync-batches
export interface CreateSyncBatchRequest {
  batch_id: string;
  device_id: string;
  s3_bucket: string;
  s3_key: string;
  transaction_count: number;
  transactions: CreateTransactionRequest[];
}

export type CreateSyncBatchResponse = SyncBatch;

// GET /stores/{storeId}/sync-status
export interface GetSyncStatusResponse {
  store_id: string;
  connectivity_state: string;
  last_successful_sync: string;
  last_sync_attempt: string;
  pending_batches: number;
  latest_batch?: SyncBatch;
}

// GET /conflicts
export interface GetConflictsQuery {
  storeId?: string;
  status?: ConflictStatus;
  limit?: number;
}

export interface GetConflictsResponse {
  conflicts: Conflict[];
}

// POST /conflicts/{conflictId}/resolve
export interface ResolveConflictRequest {
  resolution: 'ADJUST_INVENTORY' | 'CANCEL_TRANSACTION' | 'MARK_EXPLAINED';
  notes: string;
  adjusted_quantity?: number;
}

export type ResolveConflictResponse = Conflict;

// GET /suspicious-activity
export interface GetSuspiciousActivityQuery {
  storeId?: string;
  status?: SuspiciousActivityStatus;
  limit?: number;
}

export interface GetSuspiciousActivityResponse {
  alerts: SuspiciousActivity[];
}

// POST /suspicious-activity/{alertId}/review
export interface ReviewSuspiciousActivityRequest {
  notes: string;
  action_taken: 'APPROVED' | 'DISMISSED' | 'ESCALATED';
}

export type ReviewSuspiciousActivityResponse = SuspiciousActivity;

// GET /dashboard/summary
export interface DashboardSummaryResponse {
  total_stores: number;
  online_stores: number;
  offline_stores: number;
  syncing_stores: number;
  total_inventory_units: number;
  total_pending_syncs: number;
  open_conflicts_count: number;
  flagged_suspicious_count: number;
  recent_conflicts: Conflict[];
  recent_suspicious: SuspiciousActivity[];
  store_health_summary: Array<{
    store_id: string;
    name: string;
    connectivity: string;
    health: string;
    pending_syncs: number;
    open_conflicts: number;
  }>;
}

// POST /admin/thresholds
export interface UpdateThresholdsRequest {
  low_stock_default?: number;
  suspicious_quantity?: number;
  suspicious_repeat_count?: number;
  suspicious_time_window_minutes?: number;
  offline_alert_minutes?: number;
}

export interface UpdateThresholdsResponse {
  updated: boolean;
  thresholds: Record<string, number>;
}

// POST /admin/dlq/{batchId}/requeue
export interface RequeueDLQRequest {
  batch_id: string;
  reason?: string;
}

export interface RequeueDLQResponse {
  success: boolean;
  batch_id: string;
  status: string;
}
