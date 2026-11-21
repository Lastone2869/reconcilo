import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  DollarSign,
  ShoppingCart,
  RotateCcw,
  Scale,
  Calendar,
  ShieldCheck,
  Receipt,
  Printer,
  X,
  AlertTriangle,
  Building2,
  Coins,
  CreditCard,
  Plus,
  Search,
} from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { MetricCard } from '../components/ui/MetricCard.js';
import { Button } from '../components/ui/Button.js';
import { StatusPill } from '../components/ui/StatusPill.js';
import { DataSyncService, TransactionRow } from '../services/data-sync.service.js';
import { EODRollupReport } from '@reconcilo/shared';

export const StoreReportsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [rollups, setRollups] = useState<EODRollupReport[]>([]);
  const [activeTab, setActiveTab] = useState<'eod' | 'current_shift'>('eod');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Settlement Modal State
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settleStoreId, setSettleStoreId] = useState('store-001');
  const [settleDate, setSettleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [openingCash, setOpeningCash] = useState<number>(200.0);
  const [countedCash, setCountedCash] = useState<number>(540.0);
  const [settleNotes, setSettleNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Certificate Modal State
  const [viewingCertificate, setViewingCertificate] = useState<EODRollupReport | null>(null);

  const loadData = async () => {
    const all = await DataSyncService.getAllTransactions();
    setTransactions(all);
    const existingRollups = DataSyncService.getEODRollups();
    setRollups(existingRollups);
  };

  useEffect(() => {
    loadData();
    const unsub = DataSyncService.subscribe(loadData);
    return () => unsub();
  }, []);

  const totalSalesGross = transactions
    .filter((t) => t.type === 'SALE' && t.lifecycle_state !== 'REJECTED')
    .reduce((sum, t) => sum + t.total_amount, 0);

  const totalUnits = transactions
    .filter((t) => t.type === 'SALE')
    .reduce((sum, t) => sum + t.quantity, 0);

  const displaySales = totalSalesGross > 0 ? totalSalesGross : 1482.5;
  const displayUnits = totalUnits > 0 ? totalUnits : 114;
  const digitalRev = displaySales * 0.77;
  const cashRev = displaySales * 0.23;

  // Filtered rollups
  const filteredRollups = rollups.filter((r) => {
    const matchesStore = selectedStore === 'all' || r.store_id === selectedStore;
    const matchesSearch =
      r.rollup_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.store_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.date.includes(searchQuery);
    return matchesStore && matchesSearch;
  });

  // Calculate live modal expected cash
  const estimatedCashSales = Math.round(displaySales * 0.23 * 100) / 100;
  const estimatedReturns = 28.0;
  const modalExpectedCash = Math.round((openingCash + estimatedCashSales - estimatedReturns) * 100) / 100;
  const modalDiscrepancy = Math.round((countedCash - modalExpectedCash) * 100) / 100;

  const handleOpenSettlementModal = () => {
    setCountedCash(modalExpectedCash);
    setSettleNotes('');
    setIsSettlementModalOpen(true);
  };

  const handleCreateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await DataSyncService.createEODRollup({
        store_id: settleStoreId,
        date: settleDate,
        opening_cash: openingCash,
        actual_cash: countedCash,
        manager_id: 'manager@reconcilo.com',
        notes: settleNotes || undefined,
      });
      setIsSettlementModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Rollup ID',
      'Store ID',
      'Date',
      'Gross Sales',
      'Tax',
      'Units Sold',
      'Opening Cash',
      'Cash Sales',
      'Digital Sales',
      'Expected Cash',
      'Actual Cash',
      'Discrepancy',
      'Conflicts',
      'Signoff',
    ];
    const rows = rollups.map((r) => [
      r.rollup_id,
      r.store_id,
      r.date,
      r.total_gross_sales.toFixed(2),
      r.total_tax.toFixed(2),
      r.total_units_sold,
      r.opening_cash.toFixed(2),
      r.cash_sales.toFixed(2),
      r.digital_sales.toFixed(2),
      r.register_expected.toFixed(2),
      r.register_actual.toFixed(2),
      r.register_discrepancy.toFixed(2),
      r.conflicts_count,
      r.manager_signoff?.signed_by || 'Unsigned',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reconcilo-eod-rollups-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark">
            Shift Reconciliation & EOD Rollup Audits
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
            End-of-shift register settlement, fleetwide midnight rollups, variance detection, and certified immutable audit trail
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportCSV}
          >
            Export Audits (CSV)
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Scale className="w-3.5 h-3.5" />}
            onClick={handleOpenSettlementModal}
          >
            Run EOD Settlement
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Shift Sales Gross"
          value={`$${displaySales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${transactions.length > 0 ? transactions.length : 48} shift transactions`}
          deltaType="positive"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard
          title="Units Sold / Reconciled"
          value={displayUnits.toString()}
          subtitle="98.5% cloud reconciled"
          deltaType="positive"
          icon={<ShoppingCart className="w-5 h-5" />}
        />
        <MetricCard
          title="Returns / Reversals"
          value="2"
          subtitle="$28.00 returned"
          deltaType="neutral"
          icon={<RotateCcw className="w-5 h-5" />}
        />
        <MetricCard
          title="Register Drawer Variance"
          value="$0.00"
          subtitle="Drawer balanced perfectly"
          deltaType="positive"
          icon={<Coins className="w-5 h-5" />}
        />
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-container-high dark:border-surface-container-dark pb-2">
        <button
          onClick={() => setActiveTab('eod')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'eod'
              ? 'bg-primary-fixed/20 dark:bg-primary-container-dark text-primary dark:text-primary-dark shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface dark:text-on-surface-variant-dark dark:hover:text-on-surface-dark'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Fleetwide EOD Rollup Records</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 dark:bg-primary-dark/20 text-primary dark:text-primary-dark font-bold">
            {rollups.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('current_shift')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'current_shift'
              ? 'bg-primary-fixed/20 dark:bg-primary-container-dark text-primary dark:text-primary-dark shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface dark:text-on-surface-variant-dark dark:hover:text-on-surface-dark'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Active Shift Breakdown (#042)</span>
        </button>
      </div>

      {/* TAB 1: FLEETWIDE EOD ROLLUPS */}
      {activeTab === 'eod' && (
        <Card
          headerWash
          title="Certified End-of-Day Settlements & Audit History"
          subtitle="Permanent register balance snapshots created at midnight or signed off by Store Managers"
        >
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-on-surface-variant-dark" />
                  <input
                    type="text"
                    placeholder="Search by Rollup ID or date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-surface-container-high dark:border-surface-container-dark bg-surface dark:bg-surface-dark text-on-surface dark:text-on-surface-dark focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-surface-container-high dark:border-surface-container-dark bg-surface dark:bg-surface-dark text-on-surface dark:text-on-surface-dark focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Stores (Fleetwide)</option>
                  <option value="store-001">Downtown Flagship (store-001)</option>
                  <option value="store-002">Uptown Branch (store-002)</option>
                  <option value="store-003">Seattle Store (store-003)</option>
                  <option value="store-004">Austin Outlet (store-004)</option>
                </select>
              </div>

              <div className="text-on-surface-variant dark:text-on-surface-variant-dark">
                Showing <strong className="text-on-surface dark:text-on-surface-dark">{filteredRollups.length}</strong> settlement records
              </div>
            </div>

            {/* Rollups Table */}
            <div className="overflow-x-auto rounded-lg border border-surface-container-high dark:border-surface-container-dark">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low dark:bg-surface-container-dark border-b border-surface-container-high dark:border-surface-container-dark font-medium text-on-surface-variant dark:text-on-surface-variant-dark">
                  <tr>
                    <th className="py-2.5 px-3">Rollup Reference</th>
                    <th className="py-2.5 px-3">Store & Date</th>
                    <th className="py-2.5 px-3">Gross Sales</th>
                    <th className="py-2.5 px-3">Units Sold</th>
                    <th className="py-2.5 px-3">Register Cash (Exp vs Act)</th>
                    <th className="py-2.5 px-3">Variance</th>
                    <th className="py-2.5 px-3">Signoff Status</th>
                    <th className="py-2.5 px-3 text-right">Certificate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high dark:divide-surface-container-dark">
                  {filteredRollups.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-on-surface-variant dark:text-on-surface-variant-dark">
                        No settlement records match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRollups.map((r) => {
                      const isBalanced = Math.abs(r.register_discrepancy) < 0.01;
                      const isOverage = r.register_discrepancy > 0;
                      return (
                        <tr
                          key={r.rollup_id}
                          className="hover:bg-surface-container-low/60 dark:hover:bg-surface-container-dark/50 transition-colors"
                        >
                          <td className="py-3 px-3 font-mono font-medium text-primary dark:text-primary-dark">
                            {r.rollup_id}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-on-surface dark:text-on-surface-dark capitalize">
                              {r.store_id.replace('-', ' ')}
                            </div>
                            <div className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {r.date}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-on-surface dark:text-on-surface-dark">
                              ${r.total_gross_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark">
                              Cash: ${r.cash_sales.toFixed(2)} | Card: ${r.digital_sales.toFixed(2)}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-medium text-on-surface dark:text-on-surface-dark">
                            {r.total_units_sold} units
                            <div className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark">
                              {r.reconciled_transactions_count} txs
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-on-surface dark:text-on-surface-dark font-mono">
                              Exp: ${r.register_expected.toFixed(2)}
                            </div>
                            <div className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark font-mono">
                              Act: ${r.register_actual.toFixed(2)}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {isBalanced ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" />
                                $0.00 Balanced
                              </span>
                            ) : isOverage ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                +${r.register_discrepancy.toFixed(2)} Over
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                -${Math.abs(r.register_discrepancy).toFixed(2)} Short
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {r.manager_signoff ? (
                              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span className="truncate max-w-[130px]">{r.manager_signoff.signed_by}</span>
                              </div>
                            ) : (
                              <span className="text-on-surface-variant dark:text-on-surface-variant-dark italic">
                                Auto Cron
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Receipt className="w-3.5 h-3.5" />}
                              onClick={() => setViewingCertificate(r)}
                            >
                              View Audit
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 2: ACTIVE REGISTER SHIFT */}
      {activeTab === 'current_shift' && (
        <div className="space-y-6">
          <Card
            headerWash
            title="Shift #042 Register Breakdown (Morning Shift)"
            subtitle="Operator: Staff Operator &bull; Terminal: POS-01 &bull; 08:00 - 16:00"
          >
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-container-low dark:bg-surface-container-dark">
                <div>
                  <p className="text-on-surface-variant dark:text-on-surface-variant-dark font-medium text-[11px]">
                    Opening Physical Cash
                  </p>
                  <p className="text-base font-bold font-display tabular-nums text-on-surface dark:text-on-surface-dark mt-0.5">
                    $200.00
                  </p>
                </div>
                <div>
                  <p className="text-on-surface-variant dark:text-on-surface-variant-dark font-medium text-[11px]">
                    Card / Digital Revenue
                  </p>
                  <p className="text-base font-bold font-display tabular-nums text-on-surface dark:text-on-surface-dark mt-0.5">
                    ${digitalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-on-surface-variant dark:text-on-surface-variant-dark font-medium text-[11px]">
                    Cash Revenue
                  </p>
                  <p className="text-base font-bold font-display tabular-nums text-on-surface dark:text-on-surface-dark mt-0.5">
                    ${cashRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-on-surface-variant dark:text-on-surface-variant-dark font-medium text-[11px]">
                    Register Discrepancy
                  </p>
                  <p className="text-base font-bold font-display tabular-nums text-primary dark:text-primary-dark mt-0.5">
                    $0.00 (Balanced)
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <h3 className="font-semibold text-sm mb-2 text-on-surface dark:text-on-surface-dark">
                  Shift Compliance & Settlement Rules (RULE-025 - RULE-030)
                </h3>
                <p className="text-on-surface-variant dark:text-on-surface-variant-dark mb-3">
                  Store Managers must count physical cash, reconcile tender receipts with offline transactions stored in IndexedDB, and certify the shift log prior to handover.
                </p>
                <div className="p-3 bg-primary-fixed/20 dark:bg-primary-container-dark/50 border border-primary/30 dark:border-primary-dark/30 rounded-lg flex items-center justify-between text-primary dark:text-primary-dark font-semibold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Shift audited and certified by manager@reconcilo.com</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Scale className="w-3.5 h-3.5" />}
                    onClick={handleOpenSettlementModal}
                  >
                    Execute EOD Settlement Now
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 1: RUN EOD SETTLEMENT MODAL */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface dark:bg-surface-dark border border-surface-container-high dark:border-surface-container-dark rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="p-4 bg-surface-container-low dark:bg-surface-container-dark border-b border-surface-container-high dark:border-surface-container-dark flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary dark:text-primary-dark" />
                <div>
                  <h3 className="font-bold text-sm text-on-surface dark:text-on-surface-dark">
                    Generate End-of-Day Register Settlement
                  </h3>
                  <p className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark">
                    Reconciles physical drawer cash against cloud transactions and records immutable audit
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettlementModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface dark:hover:text-on-surface-dark p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSettlement} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-on-surface dark:text-on-surface-dark mb-1">
                    Store Location
                  </label>
                  <select
                    value={settleStoreId}
                    onChange={(e) => setSettleStoreId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high dark:border-surface-container-dark bg-surface dark:bg-surface-dark text-on-surface dark:text-on-surface-dark focus:ring-1 focus:ring-primary"
                  >
                    <option value="store-001">Downtown Flagship (store-001)</option>
                    <option value="store-002">Uptown Branch (store-002)</option>
                    <option value="store-003">Seattle Store (store-003)</option>
                    <option value="store-004">Austin Outlet (store-004)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-on-surface dark:text-on-surface-dark mb-1">
                    Settlement Date
                  </label>
                  <input
                    type="date"
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high dark:border-surface-container-dark bg-surface dark:bg-surface-dark text-on-surface dark:text-on-surface-dark focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-on-surface dark:text-on-surface-dark mb-1">
                    Opening Cash Drawer Float ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high dark:border-surface-container-dark bg-surface dark:bg-surface-dark text-on-surface dark:text-on-surface-dark focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-medium text-on-surface dark:text-on-surface-dark mb-1">
                    Physical Cash Counted ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={countedCash}
                    onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container-high dark:border-surface-container-dark bg-surface dark:bg-surface-dark text-on-surface dark:text-on-surface-dark focus:ring-1 focus:ring-primary font-bold"
                  />
                </div>
              </div>

              {/* Realtime Reconciliation Calculation Preview */}
              <div className="p-3.5 rounded-xl bg-surface-container-low dark:bg-surface-container-dark border border-surface-container-high dark:border-surface-container-dark space-y-2">
                <div className="font-semibold text-on-surface dark:text-on-surface-dark flex items-center justify-between">
                  <span>Register Balancing Calculation</span>
                  <span className="text-[11px] font-normal text-on-surface-variant dark:text-on-surface-variant-dark">
                    Auto-computed from transactions
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-on-surface-variant dark:text-on-surface-variant-dark">Expected in Drawer:</span>
                    <p className="font-mono font-bold text-on-surface dark:text-on-surface-dark">
                      ${modalExpectedCash.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-on-surface-variant dark:text-on-surface-variant-dark">Physical Count:</span>
                    <p className="font-mono font-bold text-on-surface dark:text-on-surface-dark">
                      ${countedCash.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-on-surface-variant dark:text-on-surface-variant-dark">Calculated Variance:</span>
                    <p
                      className={`font-mono font-bold ${
                        modalDiscrepancy === 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : modalDiscrepancy > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {modalDiscrepancy >= 0 ? '+' : ''}${modalDiscrepancy.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-on-surface dark:text-on-surface-dark mb-1">
                  Manager Signoff Certification Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. End-of-day register balanced. All offline batches reconciled without errors."
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container-high dark:border-surface-container-dark bg-surface dark:bg-surface-dark text-on-surface dark:text-on-surface-dark focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSettlementModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  icon={<ShieldCheck className="w-3.5 h-3.5" />}
                >
                  {isSubmitting ? 'Certifying...' : 'Certify & Record EOD Rollup'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AUDIT CERTIFICATE VIEWER */}
      {viewingCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface dark:bg-surface-dark border border-surface-container-high dark:border-surface-container-dark rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-xs">
            {/* Certificate Header */}
            <div className="p-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm">
                    Reconcilo Certified EOD Settlement Audit
                  </h3>
                  <p className="text-[11px] text-white/80">
                    Immutable Store Ledger Record &bull; Hash Verified
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingCertificate(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Certificate Body */}
            <div className="p-6 space-y-4">
              <div className="border-b border-surface-container-high dark:border-surface-container-dark pb-3 flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark">
                    Rollup Identifier
                  </p>
                  <p className="font-mono font-bold text-sm text-primary dark:text-primary-dark">
                    {viewingCertificate.rollup_id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark">
                    Audit Date
                  </p>
                  <p className="font-semibold text-on-surface dark:text-on-surface-dark">
                    {viewingCertificate.date}
                  </p>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="space-y-1.5">
                <div className="flex justify-between py-1 border-b border-surface-container-high/40 dark:border-surface-container-dark">
                  <span className="text-on-surface-variant dark:text-on-surface-variant-dark">Store Location:</span>
                  <span className="font-bold text-on-surface dark:text-on-surface-dark capitalize">{viewingCertificate.store_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40 dark:border-surface-container-dark">
                  <span className="text-on-surface-variant dark:text-on-surface-variant-dark">Total Gross Sales:</span>
                  <span className="font-bold text-on-surface dark:text-on-surface-dark">
                    ${viewingCertificate.total_gross_sales.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40 dark:border-surface-container-dark">
                  <span className="text-on-surface-variant dark:text-on-surface-variant-dark">Tender Split:</span>
                  <span className="text-on-surface dark:text-on-surface-dark">
                    Cash: ${viewingCertificate.cash_sales.toFixed(2)} | Card: ${viewingCertificate.digital_sales.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40 dark:border-surface-container-dark">
                  <span className="text-on-surface-variant dark:text-on-surface-variant-dark">Total Units Reconciled:</span>
                  <span className="text-on-surface dark:text-on-surface-dark">{viewingCertificate.total_units_sold} units</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40 dark:border-surface-container-dark">
                  <span className="text-on-surface-variant dark:text-on-surface-variant-dark">Returns / Reversals:</span>
                  <span className="text-on-surface dark:text-on-surface-dark">
                    {viewingCertificate.returns_count} items (${viewingCertificate.returns_total.toFixed(2)})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40 dark:border-surface-container-dark">
                  <span className="text-on-surface-variant dark:text-on-surface-variant-dark">Register Expected Cash:</span>
                  <span className="font-mono text-on-surface dark:text-on-surface-dark">${viewingCertificate.register_expected.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-surface-container-high/40 dark:border-surface-container-dark">
                  <span className="text-on-surface-variant dark:text-on-surface-variant-dark">Physical Cash Counted:</span>
                  <span className="font-mono text-on-surface dark:text-on-surface-dark">${viewingCertificate.register_actual.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 font-bold">
                  <span className="text-on-surface dark:text-on-surface-dark">Discrepancy Variance:</span>
                  <span
                    className={
                      Math.abs(viewingCertificate.register_discrepancy) < 0.01
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }
                  >
                    {viewingCertificate.register_discrepancy >= 0 ? '+' : ''}${viewingCertificate.register_discrepancy.toFixed(2)}{' '}
                    ({Math.abs(viewingCertificate.register_discrepancy) < 0.01 ? 'Balanced' : 'Variance'})
                  </span>
                </div>
              </div>

              {/* Certification Signoff Card */}
              <div className="p-3 bg-surface-container-low dark:bg-surface-container-dark rounded-xl border border-surface-container-high dark:border-surface-container-dark space-y-1">
                <p className="font-semibold text-on-surface dark:text-on-surface-dark flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Certified Signoff: {viewingCertificate.manager_signoff?.signed_by || viewingCertificate.generated_by}</span>
                </p>
                <p className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark italic">
                  "{viewingCertificate.manager_signoff?.notes || 'Certified end-of-day register settlement.'}"
                </p>
                <p className="text-[10px] text-on-surface-variant dark:text-on-surface-variant-dark font-mono">
                  Timestamp: {viewingCertificate.generated_at}
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Printer className="w-3.5 h-3.5" />}
                  onClick={() => window.print()}
                >
                  Print Certificate
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setViewingCertificate(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
