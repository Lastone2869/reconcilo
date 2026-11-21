import React, { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { StatusPill } from '../components/ui/StatusPill.js';
import { ConflictStatus, ConflictType, UserRole } from '@reconcilo/shared';
import { useAuthStore } from '../stores/auth.store.js';

import { DataSyncService, ConflictItem } from '../services/data-sync.service.js';

// Quick-fill rationale templates for RULE-052 compliance
const RATIONALE_PRESETS = [
  'Physical recount verified by manager',
  'Damaged item discarded from shelf',
  'Supplier packing discrepancy verified',
  'Barcode scanning error at checkout',
  'Theft/shrinkage investigation initiated',
];

const MIN_NOTES_LENGTH = 10;

export const ConflictResolutionPage: React.FC = () => {
  const { user } = useAuthStore();
  const isManagerOrAdmin =
    user?.role === UserRole.STORE_MANAGER || user?.role === UserRole.ADMIN;

  const [conflicts, setConflicts] = useState<ConflictItem[]>(() =>
    DataSyncService.getConflicts()
  );

  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(() => {
    const list = DataSyncService.getConflicts();
    return list.find((c) => c.status !== ConflictStatus.RESOLVED) || list[0] || null;
  });

  const [resolutionType, setResolutionType] = useState<'ADJUST_INVENTORY' | 'CANCEL_TRANSACTION' | 'MARK_EXPLAINED'>('ADJUST_INVENTORY');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Subscribe to changes
  React.useEffect(() => {
    const sync = () => {
      const updated = DataSyncService.getConflicts();
      setConflicts(updated);
    };
    const unsub = DataSyncService.subscribe(sync);
    return () => unsub();
  }, []);

  const handleResolve = () => {
    if (!selectedConflict || !resolutionNotes || isSubmitting) return;
    setIsSubmitting(true);

    setTimeout(() => {
      const conflictId = selectedConflict.conflict_id;
      DataSyncService.resolveConflict(conflictId, resolutionType, resolutionNotes);

      setSelectedConflict(null);
      setResolutionNotes('');
      setIsSubmitting(false);
      setSuccessMessage(`Conflict ${conflictId} resolved successfully and stored.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    }, 600);
  };

  // Ctrl+Enter keyboard shortcut for resolution authorization
  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (isManagerOrAdmin && resolutionNotes.length >= MIN_NOTES_LENGTH && selectedConflict?.status !== ConflictStatus.RESOLVED) {
        handleResolve();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark">
            Inventory Discrepancy & Conflict Resolution
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
            Resolve oversells, stale version collisions, and inventory deltas per RULE-028 - RULE-031
          </p>
        </div>

        {!isManagerOrAdmin && (
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
            Read-only mode (Manager or Admin role required to submit resolutions)
          </div>
        )}
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2" role="status">
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Grid: Conflict List (Left) & Resolution Workbench (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Conflict List */}
        <div className="lg:col-span-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark">
            Active Conflicts ({conflicts.filter((c) => c.status !== ConflictStatus.RESOLVED).length})
          </h2>

          {conflicts.map((conflict) => {
            const isSelected = selectedConflict?.conflict_id === conflict.conflict_id;
            return (
              <div
                key={conflict.conflict_id}
                onClick={() => setSelectedConflict(conflict)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary-fixed/10 dark:bg-primary-container-dark/30 shadow-sm'
                    : 'border-outline-variant/60 dark:border-outline-variant-dark/60 bg-surface-container-lowest dark:bg-surface-container-dark hover:border-primary/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-mono font-semibold text-error">
                      {conflict.conflict_type}
                    </span>
                    <h3 className="text-sm font-semibold font-display text-on-surface dark:text-on-surface-dark mt-1">
                      {conflict.product_name}
                    </h3>
                    <p className="text-[11px] font-mono text-on-surface-variant dark:text-on-surface-variant-dark">
                      SKU: {conflict.sku} &bull; ID: {conflict.conflict_id}
                    </p>
                  </div>
                  <StatusPill status={conflict.status} label={conflict.status} />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-outline-variant/30 dark:border-outline-variant-dark/30">
                  <span className="text-on-surface-variant dark:text-on-surface-variant-dark">
                    Discrepancy: <strong className="text-error tabular-nums font-bold">Δ {conflict.difference} units</strong>
                  </span>
                  <span className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark font-mono">
                    {new Date(conflict.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Resolution Workbench */}
        <div className="lg:col-span-6">
          {selectedConflict ? (
            <Card
              headerWash
              title={`Resolve Conflict: ${selectedConflict.conflict_id}`}
              subtitle={`Product: ${selectedConflict.product_name}`}
            >
              <div className="space-y-4 text-xs">
                {/* Expected vs Actual breakdown */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-surface-container-low dark:bg-surface-container-dark rounded-xl border border-outline-variant/40">
                  <div>
                    <p className="text-on-surface-variant uppercase font-medium text-[10px]">Expected State</p>
                    <p className="text-base font-bold font-display text-on-surface dark:text-on-surface-dark tabular-nums mt-0.5">
                      {selectedConflict.expected_state}
                    </p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant uppercase font-medium text-[10px]">Actual Physical</p>
                    <p className="text-base font-bold font-display text-on-surface dark:text-on-surface-dark tabular-nums mt-0.5">
                      {selectedConflict.actual_state}
                    </p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant uppercase font-medium text-[10px]">Difference</p>
                    <p className="text-base font-bold font-display text-error tabular-nums mt-0.5">
                      {selectedConflict.difference}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-on-surface dark:text-on-surface-dark mb-1">
                    Select Resolution Action (RULE-031)
                  </label>
                  <select
                    value={resolutionType}
                    disabled={!isManagerOrAdmin || selectedConflict.status === ConflictStatus.RESOLVED}
                    onChange={(e: any) => setResolutionType(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low dark:bg-surface-container-dark border border-outline-variant rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="ADJUST_INVENTORY">Adjust Physical Inventory (Recount Stock)</option>
                    <option value="CANCEL_TRANSACTION">Void / Rollback Conflicted Transaction</option>
                    <option value="MARK_EXPLAINED">Mark Explained with Manager Justification</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-on-surface dark:text-on-surface-dark mb-1">
                    Audit Justification & Notes (Mandatory per RULE-052)
                  </label>

                  {/* Quick-fill rationale chips */}
                  {selectedConflict.status !== ConflictStatus.RESOLVED && isManagerOrAdmin && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {RATIONALE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setResolutionNotes((prev) => prev ? `${prev}. ${preset}` : preset)}
                          className="px-2 py-1 text-[10px] font-medium bg-surface-container hover:bg-surface-container-high dark:bg-surface-container-dark dark:hover:bg-surface-container-high-dark text-on-surface-variant dark:text-on-surface-variant-dark rounded-md border border-outline-variant/40 dark:border-outline-variant-dark/40 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}

                  <textarea
                    rows={3}
                    disabled={!isManagerOrAdmin || selectedConflict.status === ConflictStatus.RESOLVED}
                    placeholder="Provide mandatory operational rationale for inventory ledger adjustment..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    onKeyDown={handleNotesKeyDown}
                    className="w-full p-3 bg-surface-container-low dark:bg-surface-container-dark border border-outline-variant dark:border-outline-variant-dark rounded-lg text-xs text-on-surface dark:text-on-surface-dark focus:ring-2 focus:ring-primary/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                    aria-label="Resolution justification notes"
                    aria-describedby="notes-helper"
                  />

                  {/* Character counter + validation helper */}
                  <div id="notes-helper" className="flex items-center justify-between mt-1">
                    {!resolutionNotes && isManagerOrAdmin && selectedConflict.status !== ConflictStatus.RESOLVED ? (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" aria-hidden="true" /> Mandatory justification required to authorize write
                      </p>
                    ) : resolutionNotes.length > 0 && resolutionNotes.length < MIN_NOTES_LENGTH ? (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" aria-hidden="true" /> Minimum {MIN_NOTES_LENGTH} characters required ({MIN_NOTES_LENGTH - resolutionNotes.length} more)
                      </p>
                    ) : (
                      <span />
                    )}
                    <span className={`text-[10px] tabular-nums ${
                      resolutionNotes.length < MIN_NOTES_LENGTH
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-on-surface-variant dark:text-on-surface-variant-dark'
                    }`}>
                      {resolutionNotes.length} chars
                    </span>
                  </div>
                </div>

                {selectedConflict.status !== ConflictStatus.RESOLVED ? (
                  <div className="space-y-2">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full mt-2"
                      disabled={!isManagerOrAdmin || !resolutionNotes || resolutionNotes.length < MIN_NOTES_LENGTH}
                      loading={isSubmitting}
                      onClick={handleResolve}
                    >
                      <span>Authorize Resolution & Write Audit Record</span>
                      <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                    </Button>
                    <p className="text-[10px] text-center text-on-surface-variant/60">
                      <kbd className="px-1 py-0.5 bg-surface-container rounded text-[9px] font-mono">Ctrl+Enter</kbd> to submit
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                    This conflict has been resolved: {selectedConflict.notes}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <div className="py-16 text-center text-on-surface-variant dark:text-on-surface-variant-dark">
                <AlertOctagon className="w-12 h-12 mx-auto stroke-[1.2] text-outline/50 mb-3" aria-hidden="true" />
                <p className="text-sm font-medium">Select a discrepancy to inspect</p>
                <p className="text-xs text-outline dark:text-outline-dark mt-1">
                  Choose an item from the list on the left to review telemetry and authorize resolution.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
