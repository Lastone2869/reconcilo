import { CreateSyncBatchRequest } from '@reconcilo/shared';
import { getStoredSession } from '../stores/auth.store.js';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://krhvqkmo51.execute-api.us-east-1.amazonaws.com';

export interface BackendHealthStatus {
  connected: boolean;
  status: number | null;
  latencyMs: number;
  url: string;
  responsePreview?: string;
  error?: string;
}

export class ApiService {
  static getBaseUrl(): string {
    return API_BASE_URL;
  }

  private static getHeaders(): Record<string, string> {
    const session = getStoredSession();
    const token = session?.token || 'stub-jwt-token-STORE_STAFF';
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Pings the API Gateway backend to verify real HTTP reachability and latency.
   */
  static async checkBackendHealth(): Promise<BackendHealthStatus> {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latencyMs = Math.round(performance.now() - start);
      const text = await res.text();

      return {
        connected: res.ok,
        status: res.status,
        latencyMs,
        url: API_BASE_URL,
        responsePreview: text.slice(0, 80),
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        connected: false,
        status: null,
        latencyMs,
        url: API_BASE_URL,
        error: err.name === 'AbortError' ? 'Timeout (4s)' : err.message,
      };
    }
  }

  /**
   * Sends a sync batch to the cloud API Gateway ingestion endpoint.
   * Upload Reliability (§13): Cloud sync attempt is recorded.
   */
  static async uploadSyncBatch(payload: CreateSyncBatchRequest): Promise<{
    success: boolean;
    cloudConfirmed: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${API_BASE_URL}/sync-batch`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await res.text();
      let parsed: any = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Response was plain text or raw string
      }

      console.log(`[ApiService] Cloud Sync-Batch Response (${res.status}):`, parsed);

      return {
        success: res.ok,
        cloudConfirmed: res.ok,
        data: parsed,
      };
    } catch (err: any) {
      console.warn('[ApiService] Cloud sync request could not reach API Gateway, running offline:', err.message);
      return {
        success: false,
        cloudConfirmed: false,
        error: err.message,
      };
    }
  }

  /**
   * Pushes conflict resolution record to cloud API Gateway.
   */
  static async resolveConflict(
    conflictId: string,
    resolutionType: string,
    notes: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ resolutionType, notes, resolved_at: new Date().toISOString() }),
      });
      return { success: res.ok };
    } catch (err: any) {
      console.warn(`[ApiService] Cloud conflict push deferred (offline):`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Pushes suspicious activity review to cloud API Gateway.
   */
  static async reviewSuspiciousActivity(
    alertId: string,
    action: string,
    notes: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/suspicious-activity/${alertId}/review`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ action, notes, reviewed_at: new Date().toISOString() }),
      });
      return { success: res.ok };
    } catch (err: any) {
      console.warn(`[ApiService] Cloud suspicious review push deferred (offline):`, err.message);
      return { success: false, error: err.message };
    }
  }
}
