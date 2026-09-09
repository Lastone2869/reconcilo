import React from 'react';
import { FileText, Download, CheckCircle2, DollarSign, ShoppingCart, RotateCcw } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { MetricCard } from '../components/ui/MetricCard.js';
import { Button } from '../components/ui/Button.js';

export const StoreReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark">
            Shift Reconciliation & Compliance Reports
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
            End-of-shift register settlement, inventory variance sign-offs, and audit exports
          </p>
        </div>

        <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />}>
          Export PDF Shift Report
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Shift Sales Gross"
          value="$1,482.50"
          subtitle="48 completed transactions"
          deltaType="positive"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard
          title="Units Sold / Reconciled"
          value="114"
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
      </div>

      <Card
        headerWash
        title="Shift #042 Register Breakdown (Morning Shift)"
        subtitle="Operator: Staff Operator &bull; Terminal: POS-01 &bull; 08:00 - 16:00"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-container-low dark:bg-surface-container-dark">
            <div>
              <p className="text-on-surface-variant font-medium text-[11px]">Opening Physical Cash</p>
              <p className="text-base font-bold font-display tabular-nums mt-0.5">$200.00</p>
            </div>
            <div>
              <p className="text-on-surface-variant font-medium text-[11px]">Card / Digital Revenue</p>
              <p className="text-base font-bold font-display tabular-nums mt-0.5">$1,142.50</p>
            </div>
            <div>
              <p className="text-on-surface-variant font-medium text-[11px]">Cash Revenue</p>
              <p className="text-base font-bold font-display tabular-nums mt-0.5">$340.00</p>
            </div>
            <div>
              <p className="text-on-surface-variant font-medium text-[11px]">Register Discrepancy</p>
              <p className="text-base font-bold font-display tabular-nums text-primary mt-0.5">$0.00 (Balanced)</p>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="font-semibold text-sm mb-2 text-on-surface dark:text-on-surface-dark">
              Manager Verification Signoff
            </h3>
            <p className="text-on-surface-variant mb-3">
              Store Manager has audited the shift log, verified all 2 resolved inventory conflicts, and confirmed physical inventory balances.
            </p>
            <div className="p-3 bg-primary-fixed/20 border border-primary/30 rounded-lg flex items-center gap-2 text-primary font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Signed by Store Manager (manager@reconcilo.com) on 2026-09-08 16:05</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
