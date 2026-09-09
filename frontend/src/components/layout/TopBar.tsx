import React, { useState } from 'react';
import {
  Bell,
  Sun,
  Moon,
  Store as StoreIcon,
  LogOut,
} from 'lucide-react';
import { StoreConnectivityState, UserRole } from '@reconcilo/shared';
import { NotificationDropdown } from './NotificationDropdown.js';

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
  unreadCount = 3,
}) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadCount);

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
          <StoreIcon className="w-4 h-4" />
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
          </div>
        </div>
      </div>

      {/* Right: Actions and User */}
      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Button & Dropdown */}
        <div className="relative">
          <button
            onClick={handleToggleNotifications}
            className={`relative p-2 rounded-lg transition-colors ${
              notificationsOpen
                ? 'bg-primary-container text-primary-on-container'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
            title="Notifications"
            aria-label="Toggle notifications menu"
          >
            <Bell className="w-4 h-4" />
            {liveUnreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-secondary rounded-full ring-2 ring-surface dark:ring-surface-dark" />
            )}
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
          <div className="w-8 h-8 rounded-full bg-primary-container text-primary-on-container flex items-center justify-center font-bold text-xs">
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
              className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded-md hover:bg-surface-container-high ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
