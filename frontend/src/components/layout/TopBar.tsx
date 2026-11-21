import React, { useState, useEffect } from 'react';
import {
  Bell,
  Sun,
  Moon,
  Store as StoreIcon,
  LogOut,
  Cloud,
} from 'lucide-react';
import { StoreConnectivityState, UserRole } from '@reconcilo/shared';
import { NotificationDropdown } from './NotificationDropdown.js';

import { DataSyncService } from '../../services/data-sync.service.js';
import { ApiService, BackendHealthStatus } from '../../services/api.service.js';

export interface TopBarProps {
  storeName?: string;
  connectivityState?: StoreConnectivityState;
  userRole?: UserRole;
  userName?: string;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onLogout?: () => void;
  onOpenNotifications?: () => void;
  unreadCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  storeName = 'Downtown Flagship',
  connectivityState = StoreConnectivityState.ONLINE,
  userRole = UserRole.STORE_STAFF,
  userName = 'Staff Operator',
  darkMode = false,
  onToggleDarkMode,
  onLogout,
  onOpenNotifications,
  unreadCount,
}) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [liveUnreadCount, setLiveUnreadCount] = useState(() =>
    unreadCount !== undefined ? unreadCount : DataSyncService.getUnreadNotificationCount()
  );

  useEffect(() => {
    const update = () => {
      setLiveUnreadCount(DataSyncService.getUnreadNotificationCount());
    };
    update();
    const unsub = DataSyncService.subscribe(update);
    return () => unsub();
  }, []);

  const [cloudStatus, setCloudStatus] = useState<BackendHealthStatus | null>(null);

  useEffect(() => {
    let active = true;
    const probe = async () => {
      const res = await ApiService.checkBackendHealth();
      if (active) setCloudStatus(res);
    };
    probe();
    const interval = setInterval(probe, 25000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleToggleNotifications = () => {
    setNotificationsOpen((prev) => !prev);
    onOpenNotifications?.();
  };
  const statusColor = {
    [StoreConnectivityState.ONLINE]: 'bg-emerald-500',
    [StoreConnectivityState.OFFLINE]: 'bg-amber-500',
    [StoreConnectivityState.SYNCING]: 'bg-indigo-500 animate-pulse',
    [StoreConnectivityState.SYNC_FAILED]: 'bg-rose-500',
  }[connectivityState] || 'bg-emerald-500';

  return (
    <header className="sticky top-0 z-30 h-16 w-full glass-panel border-b border-outline-variant/40 dark:border-outline-variant-dark/40 px-6 flex items-center justify-between transition-all">
      {/* Left: Store identification */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary dark:text-primary-dark">
          <StoreIcon className="w-4 h-4" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-sm text-on-surface dark:text-on-surface-dark">
              {storeName}
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container text-[11px] font-medium text-on-surface-variant dark:text-on-surface-variant-dark">
              <span className={`w-2 h-2 rounded-full ${statusColor}`} />
              <span className="capitalize">{connectivityState.toLowerCase()}</span>
            </div>

            {/* Live Cloud Backend Connectivity Indicator */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                cloudStatus?.connected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-700/60'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-700/60'
              }`}
              title={`API Gateway: ${ApiService.getBaseUrl()} (${cloudStatus?.latencyMs ?? 0}ms)`}
            >
              <Cloud className="w-3 h-3" aria-hidden="true" />
              <span>
                {cloudStatus?.connected
                  ? `API Gateway Online (${cloudStatus.latencyMs}ms)`
                  : 'Cloud Checking...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions and User */}
      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg text-on-surface-variant dark:text-on-surface-variant-dark hover:bg-surface-container-high dark:hover:bg-surface-container-high-dark transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
        </button>

        {/* Notifications Button & Dropdown */}
        <div className="relative">
          <button
            onClick={handleToggleNotifications}
            className={`relative p-2 rounded-lg transition-colors ${
              notificationsOpen
                ? 'bg-primary-container text-primary-on-container dark:bg-primary-container-dark dark:text-primary-dark'
                : 'text-on-surface-variant dark:text-on-surface-variant-dark hover:bg-surface-container-high dark:hover:bg-surface-container-high-dark'
            }`}
            title="Notifications"
            aria-label="Toggle notifications menu"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {liveUnreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-secondary rounded-full ring-2 ring-surface dark:ring-surface-dark" />
            )}
            {/* Screen reader live announcement for notification count */}
            <span className="sr-only" aria-live="polite">
              {liveUnreadCount > 0 ? `${liveUnreadCount} unread notifications` : 'No unread notifications'}
            </span>
          </button>

          <NotificationDropdown
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
            onUnreadCountChange={setLiveUnreadCount}
          />
        </div>

        <div className="h-6 w-px bg-outline-variant/40 dark:bg-outline-variant-dark/40 mx-1" />

        {/* User profile */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary-container text-primary-on-container dark:bg-primary-container-dark dark:text-primary-dark flex items-center justify-center font-bold text-xs">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-on-surface dark:text-on-surface-dark leading-tight">
              {userName}
            </p>
            <p className="text-[10px] text-on-surface-variant dark:text-on-surface-variant-dark uppercase tracking-wider font-medium">
              {userRole.replace(/_/g, ' ')}
            </p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 text-on-surface-variant dark:text-on-surface-variant-dark hover:text-error dark:hover:text-error-dark transition-colors rounded-md hover:bg-surface-container-high dark:hover:bg-surface-container-high-dark ml-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
