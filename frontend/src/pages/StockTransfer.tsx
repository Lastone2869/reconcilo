import React from 'react';
import { Truck, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { MetricCard } from '../components/ui/MetricCard.js';
import { Button } from '../components/ui/Button.js';
import { StatusPill } from '../components/ui/StatusPill.js';

export const StockTransferPage: React.FC = () => {
  const transfers = [
    {
      id: 'TFR-20260908-01',
      from: 'North Uptown Mall (#002)',
      to: 'Downtown Flagship (#001)',
      product: 'Compostable Cups 12oz (Pack 50)',
      sku: 'CUP-COM-12',
      quantity: 30,
      status: 'In Transit',
      initiated_by: 'admin@reconcilo.com',
      eta: 'Tomorrow, 10:00 AM',
    },
    {
      id: 'TFR-20260907-03',
      from: 'Austin Metro Center (#004)',
      to: 'Westside Harbor (#003)',
      product: 'Organic Vanilla Syrup 750ml',
      sku: 'SYR-VAN-750',
      quantity: 10,
      status: 'Delivered',
      initiated_by: 'admin@reconcilo.com',
      eta: 'Completed',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark">
            Inter-Store Stock Transfers
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
            Redistribute inventory between store nodes to balance stock levels across the fleet
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
        >
          Initiate New Transfer
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Active Transfers"
          value="1"
          subtitle="Currently in transit"
          deltaType="neutral"
          icon={<Truck className="w-5 h-5" />}
        />
        <MetricCard
          title="Completed This Month"
          value="7"
          subtitle="All verified on arrival"
          deltaType="positive"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <MetricCard
          title="Units Redistributed"
          value="284"
          subtitle="Across 4 store nodes"
          deltaType="positive"
          icon={<ArrowLeftRight className="w-5 h-5" />}
        />
      </div>

      <Card headerWash title="Transfer Manifest Log" subtitle="HQ-authorized inventory movements between store locations">
        <div className="divide-y divide-outline-variant/30 dark:divide-outline-variant-dark/30">
          {transfers.map((tfr) => (
            <div key={tfr.id} className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-container text-primary-on-container flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-on-surface dark:text-on-surface-dark">
                    {tfr.id}
                  </h3>
                  <p className="text-xs text-on-surface dark:text-on-surface-dark mt-0.5">
                    {tfr.product} ({tfr.sku}) &bull; <strong>{tfr.quantity} units</strong>
                  </p>
                  <p className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark font-mono mt-0.5">
                    From: {tfr.from} &rarr; To: {tfr.to}
                  </p>
                  <p className="text-[10px] text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
                    Authorized by: {tfr.initiated_by}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <StatusPill
                  status={tfr.status === 'Delivered' ? 'synced' : 'pending'}
                  label={tfr.status}
                />
                <p className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark mt-1 font-medium">{tfr.eta}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
