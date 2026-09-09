import {
  ApiResponse,
  DashboardSummaryResponse,
  Store,
  StoreConnectivityState,
  StoreHealthStatus,
  Inventory,
  SyncBatch,
  Conflict,
  SuspiciousActivity,
  UserRole,
} from '@reconcilo/shared';
import { DynamoDBAdapter } from '../adapters/dynamodb.adapter.js';
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

  // RBAC: Manager, Admin allowed per RULE-049, 050, FR-26
  const auth = await authorizeRequest(event, [
    UserRole.STORE_MANAGER,
    UserRole.ADMIN,
  ]);
  if (!auth.authorized) return auth.errorResponse;

  try {
    const stores = await DynamoDBAdapter.scanAll<Store>('Stores');
    const allInventory = await DynamoDBAdapter.scanAll<Inventory>('Inventory');
    const batches = await DynamoDBAdapter.scanAll<SyncBatch>('SyncBatches');
    const conflicts = await DynamoDBAdapter.scanAll<Conflict>('Conflicts');
    const suspicious = await DynamoDBAdapter.scanAll<SuspiciousActivity>('SuspiciousActivity');

    const totalInventoryUnits = allInventory.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    const pendingBatches = batches.filter((b) => b.status === 'UPLOADED' || b.status === 'QUEUED');
    const openConflicts = conflicts.filter((c) => c.status === 'OPEN' || c.status === 'UNDER_REVIEW');
    const flaggedSuspicious = suspicious.filter((s) => s.status === 'FLAGGED');

    const onlineCount = stores.filter((s) => s.connectivity_state === StoreConnectivityState.ONLINE).length;
    const offlineCount = stores.filter((s) => s.connectivity_state === StoreConnectivityState.OFFLINE).length;
    const syncingCount = stores.filter((s) => s.connectivity_state === StoreConnectivityState.SYNCING).length;

    const storeHealthSummary = stores.map((s) => {
      const storeConflicts = openConflicts.filter((c) => c.store_id === s.store_id).length;
      const storePending = pendingBatches.filter((b) => b.store_id === s.store_id).length;

      return {
        store_id: s.store_id,
        name: s.name,
        connectivity: s.connectivity_state,
        health: storeConflicts > 0 || s.connectivity_state === StoreConnectivityState.OFFLINE
          ? StoreHealthStatus.ATTENTION_REQUIRED
          : StoreHealthStatus.HEALTHY,
        pending_syncs: storePending,
        open_conflicts: storeConflicts,
      };
    });

    const response: ApiResponse<DashboardSummaryResponse> = {
      success: true,
      data: {
        total_stores: stores.length,
        online_stores: onlineCount,
        offline_stores: offlineCount,
        syncing_stores: syncingCount,
        total_inventory_units: totalInventoryUnits,
        total_pending_syncs: pendingBatches.length,
        open_conflicts_count: openConflicts.length,
        flagged_suspicious_count: flaggedSuspicious.length,
        recent_conflicts: openConflicts.slice(0, 5),
        recent_suspicious: flaggedSuspicious.slice(0, 5),
        store_health_summary: storeHealthSummary,
      },
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
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
