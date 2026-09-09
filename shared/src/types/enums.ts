/**
 * Canonical enums for Reconcilo system per architecture.md and AGENTS.md §2.
 * DO NOT rename or invent synonyms for these enum values.
 */

// Transaction lifecycle (architecture.md §6)
export enum TransactionLifecycleState {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  PROCESSING = 'PROCESSING',
  RECONCILED = 'RECONCILED',
  COMPLETED = 'COMPLETED',
  CONFLICT = 'CONFLICT',
  FLAGGED = 'FLAGGED',
  REJECTED = 'REJECTED',
}

// Transaction type
export enum TransactionType {
  SALE = 'SALE',
  RETURN = 'RETURN',
  RESTOCK = 'RESTOCK',
  ADJUSTMENT = 'ADJUSTMENT',
}

// Store connectivity (architecture.md §10)
export enum StoreConnectivityState {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  SYNCING = 'SYNCING',
  SYNC_FAILED = 'SYNC_FAILED',
}

// Store Health status (derived dashboard state per architecture.md §10)
export enum StoreHealthStatus {
  HEALTHY = 'HEALTHY',
  ATTENTION_REQUIRED = 'ATTENTION_REQUIRED',
}

// Conflict status (projectrequirements.md FR-18)
export enum ConflictStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
}

// Conflict type (architecture.md §10)
export enum ConflictType {
  OVERSOLD = 'OVERSOLD',
  INVALID_PRODUCT = 'INVALID_PRODUCT',
  INVALID_STORE = 'INVALID_STORE',
  STALE_VERSION = 'STALE_VERSION',
  ORDERING_AMBIGUITY = 'ORDERING_AMBIGUITY',
}

// Suspicious activity status (AGENTS.md §2)
export enum SuspiciousActivityStatus {
  FLAGGED = 'FLAGGED',
  REVIEWED = 'REVIEWED',
}

// Suspicious activity rule types
export enum SuspiciousRuleType {
  EXCESSIVE_QUANTITY = 'EXCESSIVE_QUANTITY',
  REPEATED_UNUSUAL_TRANSACTIONS = 'REPEATED_UNUSUAL_TRANSACTIONS',
  REPEATED_REVERSALS = 'REPEATED_REVERSALS',
}

// User roles (rules.md RULE-048-051)
export enum UserRole {
  STORE_STAFF = 'STORE_STAFF',
  STORE_MANAGER = 'STORE_MANAGER',
  ADMIN = 'ADMIN',
  SUPPLIER = 'SUPPLIER',
}

// Sync batch processing status
export enum SyncBatchStatus {
  UPLOADED = 'UPLOADED',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  DLQ = 'DLQ',
}

// Notification types
export enum NotificationType {
  LOW_STOCK = 'LOW_STOCK',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SYNC_FAILURE = 'SYNC_FAILURE',
  RECONCILIATION_REPORT = 'RECONCILIATION_REPORT',
}

// Audit record actions
export enum AuditAction {
  TRANSACTION_CREATE = 'TRANSACTION_CREATE',
  TRANSACTION_SYNC = 'TRANSACTION_SYNC',
  TRANSACTION_PROCESS = 'TRANSACTION_PROCESS',
  CONFLICT_CREATE = 'CONFLICT_CREATE',
  CONFLICT_RESOLVE = 'CONFLICT_RESOLVE',
  SUSPICIOUS_FLAG = 'SUSPICIOUS_FLAG',
  SUSPICIOUS_REVIEW = 'SUSPICIOUS_REVIEW',
  THRESHOLD_UPDATE = 'THRESHOLD_UPDATE',
  DLQ_REQUEUE = 'DLQ_REQUEUE',
}
