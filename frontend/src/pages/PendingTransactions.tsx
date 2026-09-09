import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, CheckCircle2, Clock, ArrowRight, ShieldCheck, WifiOff } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { StatusPill } from '../components/ui/StatusPill.js';
import { IndexedDBService, LocalTransaction } from '../services/indexeddb.service.js';
import { useConnectivity } from '../hooks/useConnectivity.js';

export const PendingTransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [pendingTxs, setPendingTxs] = useState<LocalTransaction[]>([]);
  const { isOnline, connectivityState, isSyncing, triggerSync, refreshPendingCount } = useConnectivity();

  const loadPending = async () => {
    const list = await IndexedDBService.getPendingTransactions();
    setPendingTxs(list);
  };

  useEffect(() => {
    loadPending();
    const interval = setInterval(loadPending, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    await triggerSync();
    await loadPending();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark">
            Offline Transaction Queue (IndexedDB)
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
            Local device store transactions awaiting cloud ingestion batch formation and S3 upload
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            loading={isSyncing}
            disabled={pendingTxs.length === 0}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={handleManualSync}
          >
            <span>{isSyncing ? 'Syncing Queue...' : `Sync Queue (${pendingTxs.length})`}</span>
          </Button>
        </div>
      </div>

      <Card
        headerWash
        title="Queued Device-Local Transactions"
        subtitle="Ordered by strict device_sequence ascending (RULE-017)"
      >
        {pendingTxs.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <CheckCircle2 className="w-12 h-12 mx-auto text-primary mb-3" />
            <p className="text-sm font-semibold">Queue is clear</p>
            <p className="text-xs text-outline mt-1">
              All transactions recorded on this terminal have been synchronized and reconciled with the cloud.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate('/pos')}
            >
              Record New Sale in POS
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-outline-variant/40 dark:border-outline-variant-dark/40 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-surface-container-low dark:bg-surface-container-low-dark border-b border-outline-variant/60">
                <tr>
                  <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant">Sequence</th>
                  <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant">Transaction ID</th>
                  <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant">Product ID</th>
                  <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant text-right">Quantity</th>
                  <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant text-right">Price</th>
                  <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant text-center">Local Status</th>
                  <th className="py-3 px-4 font-semibold uppercase text-on-surface-variant text-right">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 bg-surface-container-lowest dark:bg-surface-container-dark">
                {pendingTxs.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-primary">
                      #{tx.device_sequence}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <p className="font-semibold text-on-surface dark:text-on-surface-dark">{tx.transaction_id}</p>
                      <p className="text-[10px] text-on-surface-variant">{tx.device_id}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-on-surface-variant">
                      {tx.product_id}
                    </td>
                    <td className="py-3.5 px-4 text-right font-display font-bold tabular-nums text-sm">
                      {tx.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-display font-bold tabular-nums text-sm">
                      ${(tx.unit_price * tx.quantity).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusPill status={tx.local_sync_status} label={tx.local_sync_status} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-on-surface-variant">
                      {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
