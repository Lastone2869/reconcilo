import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  RefreshCw,
  AlertOctagon,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import { MetricCard } from '../components/ui/MetricCard.js';
import { Card } from '../components/ui/Card.js';
import { StatusPill } from '../components/ui/StatusPill.js';
import { Button } from '../components/ui/Button.js';
import { useConnectivity } from '../hooks/useConnectivity.js';
import { useEffect, useState } from 'react';
import { DataSyncService, TransactionRow } from '../services/data-sync.service.js';

export const StoreDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { pendingCount, isOnline, triggerSync, isSyncing } = useConnectivity();

  const [openConflicts, setOpenConflicts] = useState(() => DataSyncService.getOpenConflictsCount());
  const [suspiciousCount, setSuspiciousCount] = useState(() => DataSyncService.getSuspiciousCount());
  const [globalInventory, setGlobalInventory] = useState(() => DataSyncService.getGlobalInventory());
  const [totalInventory, setTotalInventory] = useState(() =>
    DataSyncService.getGlobalInventory().reduce((acc, item) => acc + item.downtownStock, 0)
  );
  const [recentTransactions, setRecentTransactions] = useState<TransactionRow[]>([]);

  useEffect(() => {
    const sync = async () => {
      setOpenConflicts(DataSyncService.getOpenConflictsCount());
      setSuspiciousCount(DataSyncService.getSuspiciousCount());
      const inv = DataSyncService.getGlobalInventory();
      setGlobalInventory(inv);
      setTotalInventory(inv.reduce((acc, item) => acc + item.downtownStock, 0));
      const txs = await DataSyncService.getAllTransactions();
      setRecentTransactions(txs.slice(0, 5));
    };
    sync();
    const unsub = DataSyncService.subscribe(sync);
    return () => unsub();
  }, []);

  const lowStockItems = globalInventory
    .filter((i) => i.downtownStock <= 15)
    .map((i) => ({
      productId: i.sku,
      name: i.name,
      sku: i.sku,
      current: i.downtownStock,
      threshold: 15,
    }));

  return (
    <div className="space-y-6">
      {/* Top Banner with Store Health and Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark">
            Store Operations Dashboard
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
            Real-time reconciliation status for Downtown Flagship #001
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerSync}
            loading={isSyncing}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Trigger Cloud Sync
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => navigate('/pos')}
          >
            New Sale
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Inventory"
          value={totalInventory.toLocaleString()}
          delta="Downtown Node #001"
          deltaType="positive"
          subtitle="Across 5 Active SKUs"
          icon={<Boxes className="w-5 h-5" />}
          iconBg="bg-primary-container text-primary-on-container"
        />
        <MetricCard
          title="Pending Syncs"
          value={pendingCount}
          subtitle="Awaiting cloud upload"
          deltaType="neutral"
          icon={<RefreshCw className="w-5 h-5" />}
          iconBg="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        />
        <MetricCard
          title="Stock Discrepancies"
          value={openConflicts}
          delta={openConflicts > 0 ? "Requires review" : "All clear"}
          deltaType={openConflicts > 0 ? "negative" : "positive"}
          subtitle="Oversell / Stale version"
          icon={<AlertOctagon className="w-5 h-5" />}
          iconBg="bg-error-container text-error"
        />
        <MetricCard
          title="Suspicious Flags"
          value={suspiciousCount}
          subtitle="Quantity rule alert"
          deltaType={suspiciousCount > 0 ? "neutral" : "positive"}
          icon={<ShieldAlert className="w-5 h-5" />}
          iconBg="bg-secondary-container text-secondary-on-container"
        />
      </div>

      {/* Middle Section: Reconciliation Progress Donut & Low-stock alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Reconciliation Health Card */}
        <div className="lg:col-span-8">
          <Card
            headerWash
            title="Reconciliation Rate & Pipeline Health"
            subtitle="Automated inventory alignment across device terminals"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
              {/* Donut progress simulation */}
              <div className="flex flex-col items-center justify-center p-4">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-surface-container stroke-current"
                      strokeWidth="3.5"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-primary stroke-current stroke-dasharray-98"
                      strokeDasharray="98, 100"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-extrabold font-display tabular-nums">98.2%</span>
                    <span className="text-[10px] text-on-surface-variant uppercase font-semibold">Matched</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-primary mt-2">Health: Optimum</span>
              </div>

              {/* Breakdown stats */}
              <div className="sm:col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-on-surface dark:text-on-surface-dark">
                    <span>Reconciled Transactions</span>
                    <span className="tabular-nums font-bold">1,084 / 1,104</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container dark:bg-surface-container-high-dark overflow-hidden">
                    <div className="h-full bg-primary rounded-full w-[98%]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-on-surface dark:text-on-surface-dark">
                    <span>IndexedDB Cache Integrity</span>
                    <span className="tabular-nums font-bold">100% Consistent</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container dark:bg-surface-container-high-dark overflow-hidden">
                    <div className="h-full brand-gradient rounded-full w-[100%]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-on-surface dark:text-on-surface-dark">
                    <span>Conflict Resolution SLA</span>
                    <span className="tabular-nums font-bold">&lt; 15 mins avg</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container dark:bg-surface-container-high-dark overflow-hidden">
                    <div className="h-full bg-secondary rounded-full w-[85%]" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Low Stock Alerts Card */}
        <div className="lg:col-span-4">
          <Card
            title="Low-Stock Alerts"
            subtitle="Triggered per RULE-024"
            action={
              <span className="text-xs font-bold text-error dark:text-error-dark bg-error-container/50 dark:bg-error-container-dark/50 px-2 py-0.5 rounded-full">
                {lowStockItems.length} SKUs
              </span>
            }
          >
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div
                  key={item.productId}
                  className="p-3 rounded-lg bg-surface-container-low dark:bg-surface-container-dark border border-outline-variant/40 dark:border-outline-variant-dark/40 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-on-surface dark:text-on-surface-dark truncate max-w-[180px]">
                      {item.name}
                    </p>
                    <p className="text-[11px] font-mono text-on-surface-variant dark:text-on-surface-variant-dark">
                      SKU: {item.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-error dark:text-error-dark font-display tabular-nums">
                      {item.current} / {item.threshold}
                    </span>
                    <p className="text-[10px] text-on-surface-variant dark:text-on-surface-variant-dark">Stock / Thresh</p>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => navigate('/supplier')}
              >
                Trigger Supplier Restock
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Activity Table */}
      <Card
        title="Live Transaction Feed"
        subtitle="Chronological feed with offline / cloud sync statuses"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/transactions')}
          >
            View All
          </Button>
        }
      >
        <div className="divide-y divide-outline-variant/30 dark:divide-outline-variant-dark/30">
          {recentTransactions.map((tx) => (
            <div key={tx.transaction_id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface-container dark:bg-surface-container-high-dark text-on-surface dark:text-on-surface-dark flex items-center justify-center font-bold text-xs">
                  {tx.type === 'SALE' ? '-' : '+'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-on-surface dark:text-on-surface-dark truncate">
                    {tx.product_name}
                  </p>
                  <p className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark font-mono">
                    #{tx.device_sequence} &bull; {tx.transaction_id.slice(0, 14)}... &bull; {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="text-xs font-bold font-display tabular-nums text-on-surface dark:text-on-surface-dark">
                  {tx.type === 'SALE' ? `-${tx.quantity}` : `+${tx.quantity}`} units
                </span>
                <StatusPill status={tx.lifecycle_state.toLowerCase()} label={tx.lifecycle_state} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
