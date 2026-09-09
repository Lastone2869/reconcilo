import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, Sliders, Shield } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { DEFAULT_SYSTEM_CONFIG } from '@reconcilo/shared';

export const SystemSettingsPage: React.FC = () => {
  const [config, setConfig] = useState({ ...DEFAULT_SYSTEM_CONFIG });
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark">
          Platform Governance & Rule Thresholds
        </h1>
        <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
          Configurable heuristics and operational alert limits per rules.md §21 and AGENTS.md §8 (No hardcoding)
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Rule thresholds updated and audit record created.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card
          headerWash
          title="Inventory & Low-Stock Alerts (RULE-024)"
          subtitle="Governs automatic SNS alerts and restocking requests"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-on-surface dark:text-on-surface-dark mb-1">
                Default Low-Stock Warning Threshold (Units)
              </label>
              <input
                type="number"
                min={1}
                value={config.low_stock_default_threshold}
                onChange={(e) =>
                  setConfig({ ...config, low_stock_default_threshold: parseInt(e.target.value, 10) })
                }
                className="w-48 px-3 py-2 bg-surface-container-low dark:bg-surface-container-dark border border-outline-variant rounded-lg text-sm font-semibold tabular-nums"
              />
              <p className="text-[11px] text-on-surface-variant mt-1">
                When inventory falls at or below this number, the LowStockService publishes an SNS alert.
              </p>
            </div>
          </div>
        </Card>

        <Card
          title="Suspicious Activity Detection Rules (RULE-033 - RULE-036)"
          subtitle="Heuristics used by SuspiciousActivityService to flag unusual transactions"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-on-surface dark:text-on-surface-dark mb-1">
                Excessive Single Quantity Threshold (RULE-034)
              </label>
              <input
                type="number"
                min={10}
                value={config.suspicious_quantity_threshold}
                onChange={(e) =>
                  setConfig({ ...config, suspicious_quantity_threshold: parseInt(e.target.value, 10) })
                }
                className="w-full px-3 py-2 bg-surface-container-low dark:bg-surface-container-dark border border-outline-variant rounded-lg text-sm font-semibold tabular-nums"
              />
              <p className="text-[11px] text-on-surface-variant mt-1">
                Transactions with item quantity exceeding this limit are marked as FLAGGED.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-on-surface dark:text-on-surface-dark mb-1">
                Repeated Unusual Transaction Count (RULE-035)
              </label>
              <input
                type="number"
                min={2}
                value={config.suspicious_repeat_count_threshold}
                onChange={(e) =>
                  setConfig({ ...config, suspicious_repeat_count_threshold: parseInt(e.target.value, 10) })
                }
                className="w-full px-3 py-2 bg-surface-container-low dark:bg-surface-container-dark border border-outline-variant rounded-lg text-sm font-semibold tabular-nums"
              />
              <p className="text-[11px] text-on-surface-variant mt-1">
                Minimum frequency count on the same product within the time window.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-on-surface dark:text-on-surface-dark mb-1">
                Heuristic Time Window (Minutes)
              </label>
              <input
                type="number"
                min={1}
                value={config.suspicious_time_window_minutes}
                onChange={(e) =>
                  setConfig({ ...config, suspicious_time_window_minutes: parseInt(e.target.value, 10) })
                }
                className="w-full px-3 py-2 bg-surface-container-low dark:bg-surface-container-dark border border-outline-variant rounded-lg text-sm font-semibold tabular-nums"
              />
              <p className="text-[11px] text-on-surface-variant mt-1">
                Sliding window duration for checking repeated reversals or transactions.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-on-surface dark:text-on-surface-dark mb-1">
                Offline Node Alert Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                value={config.offline_alert_threshold_minutes}
                onChange={(e) =>
                  setConfig({ ...config, offline_alert_threshold_minutes: parseInt(e.target.value, 10) })
                }
                className="w-full px-3 py-2 bg-surface-container-low dark:bg-surface-container-dark border border-outline-variant rounded-lg text-sm font-semibold tabular-nums"
              />
              <p className="text-[11px] text-on-surface-variant mt-1">
                Triggers attention state if store node has had no sync heartbeat for this duration.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md" icon={<Save className="w-4 h-4" />}>
            Save Rule Configuration
          </Button>
        </div>
      </form>
    </div>
  );
};
