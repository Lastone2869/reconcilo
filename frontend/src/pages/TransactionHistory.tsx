import React, { useState } from 'react';
import { Search, Filter, Download, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { StatusPill } from '../components/ui/StatusPill.js';
import { Button } from '../components/ui/Button.js';
import { SearchInput } from '../components/ui/SearchInput.js';
import { TransactionLifecycleState, TransactionType } from '@reconcilo/shared';

import { DataSyncService, TransactionRow } from '../services/data-sync.service.js';

export const TransactionHistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async () => {
    try {
      const list = await DataSyncService.getAllTransactions();
      setTransactions(list);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadTransactions();
    const unsub = DataSyncService.subscribe(() => {
      loadTransactions();
    });
    return () => unsub();
  }, []);

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.sku.toLowerCase().includes(searchTerm.toLowerCase());

    if (selectedFilter === 'ALL') return matchesSearch;
    if (selectedFilter === 'CONFLICT') return matchesSearch && tx.lifecycle_state === TransactionLifecycleState.CONFLICT;
    if (selectedFilter === 'FLAGGED') return matchesSearch && tx.lifecycle_state === TransactionLifecycleState.FLAGGED;
    if (selectedFilter === 'PENDING') return matchesSearch && tx.lifecycle_state === TransactionLifecycleState.PENDING;
    return matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark">
            Transaction Ledger & Traceability
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
            Audit-grade record of sales, returns, and inventory synchronization events (FR-30, FR-31)
          </p>
        </div>

        <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
          Export CSV
        </Button>
      </div>

      {/* Filter and Search Controls */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <SearchInput
            placeholder="Search by Transaction ID, Product name, or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-96"
          />

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['ALL', 'PENDING', 'CONFLICT', 'FLAGGED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedFilter === tab
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container dark:bg-surface-container-dark text-on-surface-variant dark:text-on-surface-variant-dark hover:bg-surface-container-high dark:hover:bg-surface-container-high-dark'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Dense Table */}
        <div className="overflow-x-auto border border-outline-variant/40 dark:border-outline-variant-dark/40 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-container-low dark:bg-surface-container-low-dark border-b border-outline-variant/60 dark:border-outline-variant-dark/60">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark">
                  Transaction ID / Device
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark">
                  Product / SKU
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark text-center">
                  Type
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark text-right">
                  Quantity
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark text-right">
                  Amount
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark text-center">
                  Lifecycle State
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark text-right">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 dark:divide-outline-variant-dark/30 bg-surface-container-lowest dark:bg-surface-container-dark">
              {filtered.map((tx) => {
                const isConflict = tx.lifecycle_state === TransactionLifecycleState.CONFLICT;
                return (
                  <tr
                    key={tx.transaction_id}
                    className={`transition-colors hover:bg-surface-container-low/60 dark:hover:bg-surface-container-high-dark/40 ${
                      isConflict
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-l-4 border-l-error dark:border-l-error-dark'
                        : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono">
                      <p className="font-semibold text-on-surface dark:text-on-surface-dark">
                        {tx.transaction_id.substring(0, 16)}...
                      </p>
                      <p className="text-[10px] text-on-surface-variant dark:text-on-surface-variant-dark">
                        {tx.device_id} &bull; Seq #{tx.device_sequence}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-on-surface dark:text-on-surface-dark">
                        {tx.product_name}
                      </p>
                      <p className="text-[10px] font-mono text-on-surface-variant dark:text-on-surface-variant-dark">{tx.sku}</p>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                          tx.type === TransactionType.SALE
                            ? 'bg-primary-container text-primary-on-container dark:bg-primary-container-dark dark:text-primary-dark'
                            : 'bg-secondary-container text-secondary-on-container dark:bg-secondary-container-dark dark:text-secondary-on-container-dark'
                        }`}
                      >
                        {tx.type === TransactionType.SALE ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {tx.type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-display font-bold tabular-nums text-sm text-on-surface dark:text-on-surface-dark">
                      {tx.quantity}
                    </td>

                    <td className="py-3.5 px-4 text-right font-display font-bold tabular-nums text-sm text-on-surface dark:text-on-surface-dark">
                      ${tx.total_amount.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <StatusPill status={tx.lifecycle_state} label={tx.lifecycle_state} />
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-on-surface-variant dark:text-on-surface-variant-dark text-[11px]">
                      {new Date(tx.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
