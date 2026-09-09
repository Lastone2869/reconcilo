export interface SystemConfig {
  low_stock_default_threshold: number;
  suspicious_quantity_threshold: number;
  suspicious_repeat_count_threshold: number;
  suspicious_time_window_minutes: number;
  offline_alert_threshold_minutes: number;
  max_sync_retry_attempts: number;
  sqs_max_receive_count: number;
  websocket_ping_interval_seconds: number;
}
