import {
  TransactionLifecycleState,
  TransactionType,
  StoreConnectivityState,
  ConflictStatus,
  ConflictType,
  SuspiciousActivityStatus,
  SuspiciousRuleType,
  UserRole,
  SyncBatchStatus,
  NotificationType,
  AuditAction,
} from './enums.js';

/**
 * Stores Entity — DynamoDB Table: Stores (PK: store_id)
 */
export interface Store {
  store_id: string;
  name: string;
  location?: string;
  connectivity_state: StoreConnectivityState;
  last_successful_sync: string; // ISO 8601
  last_sync_attempt: string; // ISO 8601
  created_at: string;
}

/**
 * Users Entity — DynamoDB Table: Users (PK: user_id)
 */
export interface User {
  user_id: string;
  email: string;
  name: string;
  role: UserRole;
  store_id?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  cognito_sub?: string;
  created_at: string;
}

/**
 * Products Entity — DynamoDB Table: Products (PK: product_id)
 */
export interface Product {
  product_id: string;
  sku: string;
  name: string;
  description?: string;
  unit_price: number;
  low_stock_threshold: number;
  created_at: string;
}

/**
 * Inventory Entity — DynamoDB Table: Inventory (PK: store_id, SK: product_id)
 */
export interface Inventory {
  store_id: string;
  product_id: string;
  quantity: number;
  version: number; // For optimistic concurrency/conditional writes (§14)
  last_updated: string; // ISO 8601
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

/**
 * Transactions Entity — DynamoDB Table: Transactions (PK: transaction_id)
 * GSI: store_id + created_at
 */
export interface Transaction {
  transaction_id: string;
  store_id: string;
  user_id: string;
  device_id: string;
  device_sequence: number;
  product_id: string;
  quantity: number;
  unit_price: number;
  type: TransactionType;
  lifecycle_state: TransactionLifecycleState;
  batch_id?: string;
  created_at: string; // ISO 8601
  processed_at?: string;
  notes?: string;
}

/**
 * SyncBatches Entity — DynamoDB Table: SyncBatches (PK: batch_id)
 */
export interface SyncBatch {
  batch_id: string;
  store_id: string;
  device_id: string;
  s3_bucket: string;
  s3_key: string;
  transaction_count: number;
  status: SyncBatchStatus;
  retry_count: number;
  uploaded_at: string; // ISO 8601
  last_attempt_at: string; // ISO 8601
  completed_at?: string;
  error_message?: string;
}

/**
 * Conflicts Entity — DynamoDB Table: Conflicts (PK: conflict_id)
 */
export interface Conflict {
  conflict_id: string;
  store_id: string;
  product_id: string;
  transaction_ids: string[];
  conflict_type: ConflictType;
  expected_state: number;
  actual_state: number;
  difference: number;
  status: ConflictStatus;
  detected_at: string; // ISO 8601
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

/**
 * SuspiciousActivity Entity — DynamoDB Table: SuspiciousActivity (PK: alert_id)
 */
export interface SuspiciousActivity {
  alert_id: string;
  store_id: string;
  user_id?: string;
  transaction_ids: string[];
  triggered_rule: SuspiciousRuleType;
  rule_description: string;
  threshold_value: number;
  actual_value: number;
  status: SuspiciousActivityStatus;
  detected_at: string; // ISO 8601
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
}

/**
 * Notifications Entity — DynamoDB Table: Notifications (PK: notification_id)
 */
export interface NotificationRecord {
  notification_id: string;
  type: NotificationType;
  recipient: string;
  subject: string;
  body: string;
  related_event_id?: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  created_at: string; // ISO 8601
}

/**
 * AuditRecords Entity — DynamoDB Table: AuditRecords (PK: audit_id, SK: created_at)
 */
export interface AuditRecord {
  audit_id: string;
  created_at: string; // ISO 8601
  entity_type: string;
  entity_id: string;
  actor: string; // user_id or system
  action: AuditAction;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

/**
 * End-of-Day (EOD) Rollup Entity — Stores end-of-day register settlement & inventory balance audit
 */
export interface EODRollupReport {
  rollup_id: string; // e.g. eod-store-001-2026-10-19
  store_id: string;
  date: string; // YYYY-MM-DD
  opening_cash: number;
  cash_sales: number;
  digital_sales: number;
  total_gross_sales: number;
  total_tax: number;
  total_units_sold: number;
  returns_count: number;
  returns_total: number;
  register_expected: number;
  register_actual: number;
  register_discrepancy: number; // actual - expected
  reconciled_transactions_count: number;
  conflicts_count: number;
  unresolved_conflicts_count: number;
  suspicious_alerts_count: number;
  generated_at: string; // ISO 8601
  generated_by: string; // user_id or 'SYSTEM_CRON'
  manager_signoff?: {
    signed_by: string;
    signed_at: string;
    notes?: string;
  };
}

