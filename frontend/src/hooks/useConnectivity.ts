import { useState, useEffect, useCallback, useRef } from 'react';
import { StoreConnectivityState } from '@reconcilo/shared';
import { IndexedDBService } from '../services/indexeddb.service.js';
import { SyncService } from '../services/sync.service.js';
import { useAuthStore } from '../stores/auth.store.js';

export function useConnectivity() {
  const { user } = useAuthStore();
  const storeId = user?.store_id || 'store-001';

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [manualOffline, setManualOffline] = useState<boolean>(false);
  const [connectivityState, setConnectivityState] = useState<StoreConnectivityState>(
    navigator.onLine ? StoreConnectivityState.ONLINE : StoreConnectivityState.OFFLINE
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Stable refs to avoid effect dependency churn (BUG-5 fix)
  const manualOfflineRef = useRef(manualOffline);
  manualOfflineRef.current = manualOffline;

  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;

  const isSyncingRef = useRef(isSyncing);
  isSyncingRef.current = isSyncing;

  // Refresh pending transactions count
  const refreshPendingCount = useCallback(async () => {
    try {
      const pending = await IndexedDBService.getPendingTransactions();
      setPendingCount(pending.length);
    } catch (e) {
      console.error('Failed to get pending transactions:', e);
    }
  }, []);

  // Trigger synchronization of pending queue (BUG-4 fix: uses storeId from auth)
  const triggerSync = useCallback(async () => {
    if (manualOfflineRef.current || !isOnlineRef.current || isSyncingRef.current) return;

    setIsSyncing(true);
    setConnectivityState(StoreConnectivityState.SYNCING);

    try {
      const result = await SyncService.syncPendingBatch(storeId);
      if (result.success) {
        setConnectivityState(StoreConnectivityState.ONLINE);
      } else {
        setConnectivityState(StoreConnectivityState.SYNC_FAILED);
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setConnectivityState(StoreConnectivityState.SYNC_FAILED);
    } finally {
      setIsSyncing(false);
      await refreshPendingCount();
    }
  }, [storeId, refreshPendingCount]);

  // Online / Offline event listeners (BUG-5 fix: stable deps, no unnecessary teardown)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!manualOfflineRef.current) {
        setConnectivityState(StoreConnectivityState.ONLINE);
        triggerSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectivityState(StoreConnectivityState.OFFLINE);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(refreshPendingCount, 2000);
    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [triggerSync, refreshPendingCount]);

  // Toggle simulation of offline mode for testing
  const toggleOfflineSimulation = () => {
    const nextState = !manualOffline;
    setManualOffline(nextState);
    if (nextState) {
      setConnectivityState(StoreConnectivityState.OFFLINE);
    } else {
      setConnectivityState(StoreConnectivityState.ONLINE);
      triggerSync();
    }
  };

  return {
    isOnline: !manualOffline && isOnline,
    connectivityState,
    pendingCount,
    isSyncing,
    manualOffline,
    toggleOfflineSimulation,
    triggerSync,
    refreshPendingCount,
  };
}
