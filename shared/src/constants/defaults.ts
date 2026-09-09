import { SystemConfig } from '../types/config.js';

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  low_stock_default_threshold: 10,
  suspicious_quantity_threshold: 100,
  suspicious_repeat_count_threshold: 5,
  suspicious_time_window_minutes: 15,
  offline_alert_threshold_minutes: 30,
  max_sync_retry_attempts: 3,
  sqs_max_receive_count: 3,
  websocket_ping_interval_seconds: 30,
};

export const TABLE_NAMES = {
  STORES: 'Stores',
  USERS: 'Users',
  PRODUCTS: 'Products',
  INVENTORY: 'Inventory',
  TRANSACTIONS: 'Transactions',
  SYNC_BATCHES: 'SyncBatches',
  CONFLICTS: 'Conflicts',
  SUSPICIOUS_ACTIVITY: 'SuspiciousActivity',
  NOTIFICATIONS: 'Notifications',
  AUDIT_RECORDS: 'AuditRecords',
} as const;
