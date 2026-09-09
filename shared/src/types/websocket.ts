import {
  StoreConnectivityState,
  ConflictStatus,
  SuspiciousActivityStatus,
  SyncBatchStatus,
} from './enums.js';

export type WebSocketMessageType =
  | 'inventory.updated'
  | 'conflict.created'
  | 'suspicious_activity.flagged'
  | 'store.connectivity_changed'
  | 'sync_batch.status_changed'
  | 'ping'
  | 'pong';

export interface WebSocketBaseMessage {
  type: WebSocketMessageType;
  timestamp: string; // ISO 8601
}

export interface InventoryUpdatedWSMessage extends WebSocketBaseMessage {
  type: 'inventory.updated';
  data: {
    store_id: string;
    product_id: string;
    quantity: number;
    version: number;
    status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  };
}

export interface ConflictCreatedWSMessage extends WebSocketBaseMessage {
  type: 'conflict.created';
  data: {
    conflict_id: string;
    store_id: string;
    product_id: string;
    conflict_type: string;
    difference: number;
    status: ConflictStatus;
  };
}

export interface SuspiciousActivityFlaggedWSMessage extends WebSocketBaseMessage {
  type: 'suspicious_activity.flagged';
  data: {
    alert_id: string;
    store_id: string;
    triggered_rule: string;
    actual_value: number;
    status: SuspiciousActivityStatus;
  };
}

export interface StoreConnectivityChangedWSMessage extends WebSocketBaseMessage {
  type: 'store.connectivity_changed';
  data: {
    store_id: string;
    connectivity_state: StoreConnectivityState;
    last_successful_sync: string;
  };
}

export interface SyncBatchStatusChangedWSMessage extends WebSocketBaseMessage {
  type: 'sync_batch.status_changed';
  data: {
    batch_id: string;
    store_id: string;
    status: SyncBatchStatus;
    transaction_count: number;
    error_message?: string;
  };
}

export type WebSocketMessage =
  | InventoryUpdatedWSMessage
  | ConflictCreatedWSMessage
  | SuspiciousActivityFlaggedWSMessage
  | StoreConnectivityChangedWSMessage
  | SyncBatchStatusChangedWSMessage;
