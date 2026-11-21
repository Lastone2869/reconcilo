import React from 'react';
import {
  Layers,
  Store as StoreIcon,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { MetricCard } from '../components/ui/MetricCard.js';
import { StatusPill } from '../components/ui/StatusPill.js';
import { StoreConnectivityState, StoreHealthStatus } from '@reconcilo/shared';

import { useState, useEffect } from 'react';
import { DataSyncService } from '../services/data-sync.service.js';

export const HQDashboardPage: React.FC = () => {
  const [openConflicts, setOpenConflicts] = useState(() => DataSyncService.getOpenConflictsCount());
  const [globalTotal, setGlobalTotal] = useState(() =>
    DataSyncService.getGlobalInventory().reduce((acc, item) => acc + item.total, 0)
  );

  useEffect(() => {
    const sync = () => {
      setOpenConflicts(DataSyncService.getOpenConflictsCount());
      setGlobalTotal(
        DataSyncService.getGlobalInventory().reduce((acc, item) => acc + item.total, 0)
      );
    };
    const unsub = DataSyncService.subscribe(sync);
    return () => unsub();
  }, []);

  const stores = [
    {
      id: 'store-001',
      name: 'Downtown Flagship',
      location: 'New York, NY',
      connectivity: StoreConnectivityState.ONLINE,
      health: StoreHealthStatus.HEALTHY,
      inventoryUnits: 1428,
      pendingBatches: 0,
      openConflicts: 0,
      lastSync: 'Just now',
    },
    {
      id: 'store-002',
      name: 'North Uptown Mall',
      location: 'Chicago, IL',
      connectivity: StoreConnectivityState.ONLINE,
      health: StoreHealthStatus.HEALTHY,
      inventoryUnits: 980,
      pendingBatches: 1,
      openConflicts: 0,
      lastSync: '4 mins ago',
    },
    {
      id: 'store-003',
      name: 'Westside Harbor Express',
      location: 'Seattle, WA',
      connectivity: StoreConnectivityState.OFFLINE,
      health: openConflicts > 0 ? StoreHealthStatus.ATTENTION_REQUIRED : StoreHealthStatus.HEALTHY,
      inventoryUnits: 654,
      pendingBatches: 12,
      openConflicts: openConflicts,
      lastSync: '42 mins ago',
    },
    {
      id: 'store-004',
      name: 'Austin Metro Center',
      location: 'Austin, TX',
      connectivity: StoreConnectivityState.SYNCING,
      health: StoreHealthStatus.HEALTHY,
      inventoryUnits: 1120,
      pendingBatches: 3,
      openConflicts: 0,
      lastSync: 'Syncing batch #481',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark">
            HQ Multi-Store Fleet Command
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
            Enterprise multi-node store connectivity and distributed stock reconciliation grid
          </p>
        </div>
      </div>

      {/* Fleet Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Stores"
          value="4 / 4"
          subtitle="All regions operational"
          deltaType="positive"
          icon={<StoreIcon className="w-5 h-5" />}
        />
        <MetricCard
          title="Enterprise Stock"
          value={globalTotal.toLocaleString()}
          subtitle="Units across all stores"
          delta="+140 vs yesterday"
          deltaType="positive"
          icon={<Layers className="w-5 h-5" />}
        />
        <MetricCard
          title="Offline Store Nodes"
          value="1"
          subtitle="Westside Harbor (Seattle)"
          delta="Offline > 30m"
          deltaType="negative"
          icon={<WifiOff className="w-5 h-5" />}
          iconBg="bg-amber-100 text-amber-800"
        />
        <MetricCard
          title="Fleet Discrepancies"
          value={openConflicts}
          subtitle="Pending manager signoff"
          deltaType={openConflicts > 0 ? "neutral" : "positive"}
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBg="bg-error-container text-error"
        />
      </div>

      {/* Store Nodes Grid */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark mb-3">
          Store Node Telemetry Grid
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stores.map((store) => (
            <Card key={store.id} headerWash={store.health === StoreHealthStatus.HEALTHY}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold font-display text-on-surface dark:text-on-surface-dark">
                    {store.name}
                  </h3>
                  <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark">{store.location} &bull; ID: {store.id}</p>
                </div>
                <StatusPill status={store.connectivity} label={store.connectivity} />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-outline-variant/30 dark:border-outline-variant-dark/30 text-xs">
                <div>
                  <p className="text-[10px] uppercase font-medium text-on-surface-variant dark:text-on-surface-variant-dark">Inventory</p>
                  <p className="text-sm font-bold font-display tabular-nums mt-0.5 text-on-surface dark:text-on-surface-dark">{store.inventoryUnits} units</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-medium text-on-surface-variant dark:text-on-surface-variant-dark">Queued Syncs</p>
                  <p className="text-sm font-bold font-display tabular-nums mt-0.5 text-amber-600 dark:text-amber-400">{store.pendingBatches} batches</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-medium text-on-surface-variant dark:text-on-surface-variant-dark">Conflicts</p>
                  <p className="text-sm font-bold font-display tabular-nums mt-0.5 text-error dark:text-error">{store.openConflicts} open</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark font-mono">
                <span>Last heartbeat: {store.lastSync}</span>
                <span className={`font-semibold ${store.health === StoreHealthStatus.HEALTHY ? 'text-primary dark:text-primary-dark' : 'text-error'}`}>
                  {store.health}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
