import React, { useState } from 'react';
import { AlertCircle, RotateCcw, CheckCircle2, Search, ArrowRight, ShieldAlert } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { StatusPill } from '../components/ui/StatusPill.js';

import { DataSyncService, DLQItem } from '../services/data-sync.service.js';

export const DLQInvestigationPage: React.FC = () => {
  const [messages, setMessages] = useState<DLQItem[]>(() =>
    DataSyncService.getDLQMessages()
  );

  const [selectedMessage, setSelectedMessage] = useState<DLQItem | null>(() => {
    const list = DataSyncService.getDLQMessages();
    return list[0] || null;
  });
  const [isRequeueing, setIsRequeueing] = useState(false);
  const [notification, setNotification] = useState('');

  React.useEffect(() => {
    const sync = () => {
      const list = DataSyncService.getDLQMessages();
      setMessages(list);
      if (selectedMessage && !list.find((m) => m.batch_id === selectedMessage.batch_id)) {
        setSelectedMessage(list[0] || null);
      }
    };
    const unsub = DataSyncService.subscribe(sync);
    return () => unsub();
  }, [selectedMessage]);

  const handleRequeue = (batchId: string) => {
    setIsRequeueing(true);

    setTimeout(() => {
      DataSyncService.requeueDLQMessage(batchId);
      setIsRequeueing(false);
      setNotification(`Batch ${batchId} was successfully returned to the main processing FIFO queue.`);
      setTimeout(() => setNotification(''), 4000);
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark">
          Dead Letter Queue (DLQ) Triage
        </h1>
        <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
          Quarantined batches from SQS FIFO queue after 3 failed retry attempts (FR-29)
        </p>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: DLQ items */}
        <div className="lg:col-span-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark">
            Quarantined Messages ({messages.length})
          </h2>

          {messages.length === 0 ? (
            <Card>
              <div className="py-12 text-center text-on-surface-variant dark:text-on-surface-variant-dark">
                <CheckCircle2 className="w-10 h-10 mx-auto text-primary dark:text-primary-dark mb-2" />
                <p className="text-sm font-semibold text-on-surface dark:text-on-surface-dark">DLQ is empty</p>
                <p className="text-xs text-outline dark:text-outline-dark mt-0.5">No failed ingestion batches in quarantine.</p>
              </div>
            </Card>
          ) : (
            messages.map((item) => (
              <div
                key={item.message_id}
                onClick={() => setSelectedMessage(item)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedMessage?.message_id === item.message_id
                    ? 'border-error bg-error-container/20 shadow-sm'
                    : 'border-outline-variant/60 dark:border-outline-variant-dark/60 bg-surface-container-lowest dark:bg-surface-container-dark hover:border-error/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-semibold text-error">
                      {item.batch_id}
                    </span>
                    <h3 className="text-xs font-semibold text-on-surface dark:text-on-surface-dark mt-1 line-clamp-1">
                      {item.failure_reason}
                    </h3>
                    <p className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark font-mono mt-0.5">
                      Store: {item.store_id} &bull; Retries: {item.retry_count}/3
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-error text-white">
                    FAILED
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Deep inspection and Requeue action */}
        <div className="lg:col-span-6">
          {selectedMessage ? (
            <Card
              headerWash
              title={`Inspect Batch: ${selectedMessage.batch_id}`}
              subtitle={`Message ID: ${selectedMessage.message_id}`}
            >
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-error-container/30 border border-error/30 rounded-lg">
                  <p className="font-semibold text-error uppercase text-[10px]">Failure Root Cause</p>
                  <p className="text-on-surface dark:text-on-surface-dark mt-1 font-medium">{selectedMessage.failure_reason}</p>
                </div>

                <div>
                  <label className="block font-semibold text-on-surface dark:text-on-surface-dark mb-1">
                    Raw SQS Message Body Payload
                  </label>
                  <pre className="p-3 bg-surface-container-low dark:bg-surface-container-dark font-mono text-[11px] rounded-lg border border-outline-variant/50 dark:border-outline-variant-dark/50 overflow-x-auto text-on-surface-variant dark:text-on-surface-variant-dark">
                    {JSON.stringify(JSON.parse(selectedMessage.payload_snippet), null, 2)}
                  </pre>
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    loading={isRequeueing}
                    icon={<RotateCcw className="w-4 h-4" />}
                    onClick={() => handleRequeue(selectedMessage.batch_id)}
                  >
                    <span>Requeue to Main Processing FIFO Queue (FR-29)</span>
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="py-16 text-center text-on-surface-variant dark:text-on-surface-variant-dark">
                <AlertCircle className="w-12 h-12 mx-auto stroke-[1.2] text-outline/50 mb-3" />
                <p className="text-sm font-medium">Select a quarantined message</p>
                <p className="text-xs text-outline dark:text-outline-dark mt-1">Review diagnostic logs and return message to queue.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
