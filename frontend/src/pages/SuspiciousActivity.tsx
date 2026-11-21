import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Eye, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { StatusPill } from '../components/ui/StatusPill.js';
import { SuspiciousActivityStatus, SuspiciousRuleType, UserRole } from '@reconcilo/shared';
import { DataSyncService, AlertItem } from '../services/data-sync.service.js';
import { useAuthStore } from '../stores/auth.store.js';

export const SuspiciousActivityPage: React.FC = () => {
  const { user } = useAuthStore();
  const isManagerOrAdmin =
    user?.role === UserRole.STORE_MANAGER || user?.role === UserRole.ADMIN;

  const [alerts, setAlerts] = useState<AlertItem[]>(() =>
    DataSyncService.getSuspiciousAlerts()
  );

  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(() => {
    const list = DataSyncService.getSuspiciousAlerts();
    return list.find((a) => a.status === SuspiciousActivityStatus.FLAGGED) || list[0] || null;
  });

  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'DISMISSED' | 'ESCALATED'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  React.useEffect(() => {
    const sync = () => {
      setAlerts(DataSyncService.getSuspiciousAlerts());
    };
    const unsub = DataSyncService.subscribe(sync);
    return () => unsub();
  }, []);

  const handleReview = () => {
    if (!selectedAlert || !reviewNotes || isSubmitting) return;
    setIsSubmitting(true);

    setTimeout(() => {
      const alertId = selectedAlert.alert_id;
      DataSyncService.reviewAlert(alertId, reviewAction, reviewNotes);

      setSelectedAlert(null);
      setReviewNotes('');
      setIsSubmitting(false);
      setSuccessBanner(`Alert ${alertId} marked as ${reviewAction} and saved.`);
      setTimeout(() => setSuccessBanner(''), 4000);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark">
            Suspicious Activity & Anomaly Monitoring
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
            Real-time pattern heuristics (excessive quantities, repeated reversals). Flagged for attention per RULE-033 - RULE-038.
          </p>
        </div>

        <div className="px-3 py-1 bg-secondary-container text-secondary-on-container rounded-full text-xs font-semibold">
          RULE-037 Compliant: Informational Flagging
        </div>
      </div>

      {successBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Grid: Alert List (Left) & Review Workbench (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Alert List */}
        <div className="lg:col-span-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark">
            Monitored Alerts ({alerts.length})
          </h2>

          {alerts.map((alert) => {
            const isSelected = selectedAlert?.alert_id === alert.alert_id;
            return (
              <div
                key={alert.alert_id}
                onClick={() => setSelectedAlert(alert)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-secondary bg-secondary-container/20 shadow-sm'
                    : 'border-outline-variant/60 dark:border-outline-variant-dark/60 bg-surface-container-lowest dark:bg-surface-container-dark hover:border-secondary/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-mono font-semibold text-secondary dark:text-secondary-dark">
                      {alert.triggered_rule}
                    </span>
                    <h3 className="text-sm font-semibold font-display text-on-surface dark:text-on-surface-dark mt-1">
                      {alert.rule_description}
                    </h3>
                    <p className="text-[11px] font-mono text-on-surface-variant dark:text-on-surface-variant-dark">
                      Alert: {alert.alert_id} &bull; Store: {alert.store_id}
                    </p>
                  </div>
                  <StatusPill status={alert.status} label={alert.status} />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-outline-variant/30 dark:border-outline-variant-dark/30">
                  <span className="text-on-surface-variant dark:text-on-surface-variant-dark">
                    Observed Value: <strong className="text-secondary dark:text-secondary-dark font-bold tabular-nums">{alert.actual_value}</strong> (Threshold: {alert.threshold_value})
                  </span>
                  <span className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark font-mono">
                    {new Date(alert.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Alert Review Panel */}
        <div className="lg:col-span-6">
          {selectedAlert ? (
            <Card
              headerWash
              title={`Review Alert: ${selectedAlert.alert_id}`}
              subtitle={`Triggered Rule: ${selectedAlert.triggered_rule}`}
            >
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-secondary-container/30 rounded-xl border border-secondary/30">
                  <p className="font-semibold text-secondary-on-container">
                    Rule Evaluation Details
                  </p>
                  <p className="text-on-surface-variant dark:text-on-surface-variant-dark mt-1">
                    {selectedAlert.rule_description}
                  </p>
                  <p className="text-[11px] font-mono text-on-surface-variant dark:text-on-surface-variant-dark mt-2">
                    Related Transactions: {selectedAlert.transaction_ids.join(', ')}
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-on-surface dark:text-on-surface-dark mb-1">
                    Manager Review Action (RULE-038)
                  </label>
                  <select
                    value={reviewAction}
                    disabled={!isManagerOrAdmin || selectedAlert.status === SuspiciousActivityStatus.REVIEWED}
                    onChange={(e: any) => setReviewAction(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low dark:bg-surface-container-dark border border-outline-variant dark:border-outline-variant-dark text-on-surface dark:text-on-surface-dark rounded-lg text-xs font-medium focus:ring-2 focus:ring-secondary/50"
                  >
                    <option value="APPROVED">Acknowledge & Confirm Legitimate Order</option>
                    <option value="DISMISSED">Dismiss as Normal Variance</option>
                    <option value="ESCALATED">Escalate to HQ Operations Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-on-surface dark:text-on-surface-dark mb-1">
                    Review Rationale & Explanatory Notes
                  </label>
                  <textarea
                    rows={3}
                    disabled={!isManagerOrAdmin || selectedAlert.status === SuspiciousActivityStatus.REVIEWED}
                    placeholder="Enter operational explanation (e.g. verified bulk customer order)..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full p-3 bg-surface-container-low dark:bg-surface-container-dark border border-outline-variant dark:border-outline-variant-dark text-on-surface dark:text-on-surface-dark rounded-lg text-xs focus:ring-2 focus:ring-secondary/50"
                  />
                </div>

                {selectedAlert.status !== SuspiciousActivityStatus.REVIEWED ? (
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full mt-2"
                    disabled={!isManagerOrAdmin || !reviewNotes}
                    loading={isSubmitting}
                    onClick={handleReview}
                  >
                    <span>Submit Review & Close Alert</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                    This alert has been reviewed: {selectedAlert.review_notes}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <div className="py-16 text-center text-on-surface-variant dark:text-on-surface-variant-dark">
                <ShieldAlert className="w-12 h-12 mx-auto stroke-[1.2] text-outline/50 mb-3" />
                <p className="text-sm font-medium">Select an alert to investigate</p>
                <p className="text-xs text-outline dark:text-outline-dark mt-1">
                  Choose a flagged transaction pattern from the left to record manager review.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
