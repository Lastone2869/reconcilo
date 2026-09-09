import React, { useState } from 'react';
import { Search, Filter, Download, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { StatusPill } from '../components/ui/StatusPill.js';
import { Button } from '../components/ui/Button.js';
import { SearchInput } from '../components/ui/SearchInput.js';
import { TransactionLifecycleState, TransactionType } from '@reconcilo/shared';

interface TransactionRow {
  transaction_id: string;
  device_id: string;
  device_sequence: number;
  product_name: string;
  sku: string;
  quantity: number;
  type: TransactionType;
  total_amount: number;
  lifecycle_state: TransactionLifecycleState;
  created_at: string;
}

export const TransactionHistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  const mockTransactions: TransactionRow[] = [
    {
      transaction_id: 'tx-9f82a10b-3b4c-4e89-8d1e',
      device_id: 'pos-terminal-01',
      device_sequence: 104,
      product_name: 'Espresso Roast Beans 1kg',
      sku: 'CF-ESP-1KG',
      quantity: 2,
      type: TransactionType.SALE,
      total_amount: 49.0,
      lifecycle_state: TransactionLifecycleState.COMPLETED,
      created_at: '2026-09-08T14:32:00Z',
    },
    {
      transaction_id: 'tx-8e71b29a-2a3b-4d78-9c0d',
      device_id: 'pos-terminal-01',
      device_sequence: 103,
      product_name: 'Barista Oat Milk 1L',
      sku: 'MLK-OAT-1L',
      quantity: 5,
      type: TransactionType.SALE,
      total_amount: 21.25,
      lifecycle_state: TransactionLifecycleState.RECONCILED,
      created_at: '2026-09-08T14:28:15Z',
    },
    {
      transaction_id: 'tx-7d60c189-1a2b-3c67-8b9c',
      device_id: 'pos-terminal-02',
      device_sequence: 82,
      product_name: 'Organic Vanilla Syrup 750ml',
      sku: 'SYR-VAN-750',
      quantity: 12,
      type: TransactionType.SALE,
      total_amount: 138.0,
      lifecycle_state: TransactionLifecycleState.CONFLICT,
      created_at: '2026-09-08T14:15:30Z',
    },
    {
      transaction_id: 'tx-6c59b078-0a1b-2b56-7a8b',
      device_id: 'pos-terminal-01',
      device_sequence: 102,
      product_name: 'Compostable Cups 12oz',
      sku: 'CUP-COM-12',
      quantity: 150,
      type: TransactionType.SALE,
      total_amount: 54.0,
      lifecycle_state: TransactionLifecycleState.FLAGGED,
      created_at: '2026-09-08T13:58:00Z',
    },
    {
      transaction_id: 'tx-5b48a967-990a-1a45-697a',
      device_id: 'pos-terminal-01',
      device_sequence: 101,
      product_name: 'Single Origin Filter 250g',
      sku: 'CF-FLT-250G',
      quantity: 1,
      type: TransactionType.RETURN,
      total_amount: 14.0,
      lifecycle_state: TransactionLifecycleState.COMPLETED,
      created_at: '2026-09-08T13:42:10Z',
    },
    {
      transaction_id: 'tx-4a37a856-8899-0934-5869',
      device_id: 'pos-terminal-02',
      device_sequence: 81,
      product_name: 'Espresso Roast Beans 1kg',
      sku: 'CF-ESP-1KG',
      quantity: 3,
      type: TransactionType.SALE,
      total_amount: 73.5,
      lifecycle_state: TransactionLifecycleState.PENDING,
      created_at: '2026-09-08T13:30:00Z',
    },
  ];

  const filtered = mockTransactions.filter((tx) => {
    const matchesSearch =
      tx.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.sku.toLowerCase().includes(searchTerm.toLowerCase());

    if (selectedFilter === 'ALL') return matchesSearch;
    if (selectedFilter === 'CONFLICT') return matchesSearch && tx.lifecycle_state === TransactionLifecycleState.CONFLICT;
    if (selectedFilter === 'FLAGGED') return matchesSearch && tx.lifecycle_state === TransactionLifecycleState.FLAGGED;
    if (selectedFilter === 'PENDING') return matchesSearch && tx.lifecycle_state === TransactionLifecycleState.PENDING;
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
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
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
            <thead className="bg-surface-container-low dark:bg-surface-container-low-dark border-b border-outline-variant/60">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant">
                  Transaction ID / Device
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant">
                  Product / SKU
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant text-center">
                  Type
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant text-right">
                  Quantity
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant text-right">
                  Amount
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant text-center">
                  Lifecycle State
                </th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant text-right">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 bg-surface-container-lowest dark:bg-surface-container-dark">
              {filtered.map((tx) => {
                const isConflict = tx.lifecycle_state === TransactionLifecycleState.CONFLICT;
                return (
                  <tr
                    key={tx.transaction_id}
                    className={`transition-colors hover:bg-surface-container-low/60 ${
                      isConflict
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-l-4 border-l-error'
                        : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono">
                      <p className="font-semibold text-on-surface dark:text-on-surface-dark">
                        {tx.transaction_id.substring(0, 16)}...
                      </p>
                      <p className="text-[10px] text-on-surface-variant">
                        {tx.device_id} &bull; Seq #{tx.device_sequence}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-on-surface dark:text-on-surface-dark">
                        {tx.product_name}
                      </p>
                      <p className="text-[10px] font-mono text-on-surface-variant">{tx.sku}</p>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                          tx.type === TransactionType.SALE
                            ? 'bg-primary-container text-primary-on-container'
                            : 'bg-secondary-container text-secondary-on-container'
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

                    <td className="py-3.5 px-4 text-right font-display font-bold tabular-nums text-sm">
                      {tx.quantity}
                    </td>

                    <td className="py-3.5 px-4 text-right font-display font-bold tabular-nums text-sm">
                      ${tx.total_amount.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <StatusPill status={tx.lifecycle_state} label={tx.lifecycle_state} />
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-on-surface-variant text-[11px]">
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
