import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export interface OfflineBannerProps {
  isOffline: boolean;
  pendingCount?: number;
  onManualSync?: () => void;
  isSyncing?: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOffline,
  pendingCount = 0,
  onManualSync,
  isSyncing = false,
}) => {
  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className="w-full bg-[#FFF9E6] dark:bg-[#2C2413] border-b border-[#FFE7A3] dark:border-[#52411C] px-4 py-2.5 flex items-center justify-between text-xs font-medium text-[#8D6208] dark:text-[#E8BD61] transition-all duration-300">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-[#8D6208] dark:text-[#E8BD61] animate-pulse" />
        <span>
          {isOffline
            ? 'Offline Mode Active: Sales are saved securely in local storage and will sync automatically when reconnected.'
            : `${pendingCount} offline transaction(s) queued for synchronization.`}
        </span>
      </div>
      {onManualSync && (
        <button
          onClick={onManualSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#8D6208] text-white dark:bg-[#E8BD61] dark:text-[#2C2413] rounded-md hover:opacity-90 disabled:opacity-50 transition-all font-semibold"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      )}
    </div>
  );
};
