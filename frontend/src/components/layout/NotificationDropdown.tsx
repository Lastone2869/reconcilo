import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertOctagon,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Truck,
  ExternalLink,
  X,
} from 'lucide-react';

import { DataSyncService, NotificationItem } from '../../services/data-sync.service.js';

export type { NotificationItem };

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    DataSyncService.getNotifications()
  );
  const [filter, setFilter] = useState<'all' | 'unread' | 'alerts'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Listen for data changes across tabs or other components
  useEffect(() => {
    const sync = () => {
      setNotifications(DataSyncService.getNotifications());
    };
    const unsubscribe = DataSyncService.subscribe(sync);
    return () => unsubscribe();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const markAllAsRead = () => {
    DataSyncService.markAllNotificationsAsRead();
  };

  const clearAll = () => {
    DataSyncService.clearAllNotifications();
  };

  const markAsRead = (id: string) => {
    DataSyncService.markNotificationAsRead(id);
  };

  const dismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    DataSyncService.dismissNotification(id);
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markAsRead(item.id);
    if (item.link) {
      navigate(item.link);
      onClose();
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'alerts') return n.severity === 'HIGH' || n.severity === 'MEDIUM';
    return true;
  });

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'CONFLICT':
        return <AlertOctagon className="w-4 h-4 text-error" />;
      case 'SUSPICIOUS':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'LOW_STOCK':
        return <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'SYNC':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'RESTOCK':
        return <Truck className="w-4 h-4 text-primary" />;
      default:
        return <Bell className="w-4 h-4 text-on-surface-variant dark:text-on-surface-variant-dark" />;
    }
  };

  const getIconBg = (type: NotificationItem['type']) => {
    switch (type) {
      case 'CONFLICT':
        return 'bg-error-container/30 text-error';
      case 'SUSPICIOUS':
        return 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400';
      case 'LOW_STOCK':
        return 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300';
      case 'SYNC':
        return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300';
      case 'RESTOCK':
        return 'bg-primary-container/40 text-primary';
      default:
        return 'bg-surface-container text-on-surface-variant';
    }
  };

  return (
    <div
      ref={dropdownRef}
      role="dialog"
      aria-label="Operational notifications"
      className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-surface dark:bg-surface-container-low-dark border border-outline-variant/60 dark:border-outline-variant-dark/60 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="p-4 border-b border-outline-variant/40 dark:border-outline-variant-dark/40 flex items-center justify-between bg-surface-container-lowest/50 dark:bg-surface-container-lowest-dark/30 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary-container text-primary-on-container">
            <Bell className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm text-on-surface dark:text-on-surface-dark">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-white">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark">
              Operational alerts and sync updates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="p-1.5 text-on-surface-variant dark:text-on-surface-variant-dark hover:text-primary dark:hover:text-primary-dark rounded-lg hover:bg-surface-container dark:hover:bg-surface-container-dark transition-colors text-xs flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              title="Mark all as read"
              aria-label="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="p-1.5 text-on-surface-variant dark:text-on-surface-variant-dark hover:text-error dark:hover:text-error-dark rounded-lg hover:bg-surface-container dark:hover:bg-surface-container-dark transition-colors text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              title="Clear all"
              aria-label="Clear all notifications"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-on-surface-variant dark:text-on-surface-variant-dark hover:text-on-surface dark:hover:text-on-surface-dark rounded-lg hover:bg-surface-container dark:hover:bg-surface-container-dark transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            title="Close"
            aria-label="Close notifications panel"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 py-2 flex items-center gap-1.5 border-b border-outline-variant/30 dark:border-outline-variant-dark/30 bg-surface-container-low/50 dark:bg-surface-container-low-dark/20 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-white font-semibold'
              : 'text-on-surface-variant dark:text-on-surface-variant-dark hover:bg-surface-container dark:hover:bg-surface-container-dark'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-primary text-white font-semibold'
              : 'text-on-surface-variant dark:text-on-surface-variant-dark hover:bg-surface-container dark:hover:bg-surface-container-dark'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('alerts')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            filter === 'alerts'
              ? 'bg-primary text-white font-semibold'
              : 'text-on-surface-variant dark:text-on-surface-variant-dark hover:bg-surface-container dark:hover:bg-surface-container-dark'
          }`}
        >
          Alerts ({notifications.filter((n) => n.severity !== 'INFO').length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-outline-variant/20 dark:divide-outline-variant-dark/20">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-surface-container mx-auto flex items-center justify-center text-on-surface-variant mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-xs font-semibold text-on-surface dark:text-on-surface-dark">
              All caught up!
            </p>
            <p className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
              No notifications matching this filter
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              aria-label={`${item.read ? '' : 'Unread: '}${item.title}, ${item.message}`}
              onClick={() => handleNotificationClick(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNotificationClick(item);
                }
              }}
              className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                !item.read
                  ? 'bg-primary-fixed/10 dark:bg-primary-container-dark/10 hover:bg-primary-fixed/20 dark:hover:bg-primary-container-dark/20'
                  : 'hover:bg-surface-container/60 dark:hover:bg-surface-container-high-dark/40'
              }`}
            >
              {/* Type Icon */}
              <div className={`p-2 rounded-xl flex-shrink-0 ${getIconBg(item.type)}`} aria-hidden="true">
                {getIcon(item.type)}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-xs font-semibold text-on-surface dark:text-on-surface-dark truncate">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-on-surface-variant dark:text-on-surface-variant-dark flex-shrink-0">
                    {item.time}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant dark:text-on-surface-variant-dark line-clamp-2 leading-relaxed">
                  {item.message}
                </p>

                {item.link && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-primary dark:text-primary-dark">
                    <span>Inspect details</span>
                    <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
                  </div>
                )}
              </div>

              {/* Unread indicator / dismiss */}
              <div className="flex flex-col items-center gap-2">
                {!item.read && (
                  <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0" aria-hidden="true" />
                )}
                <button
                  onClick={(e) => dismissNotification(item.id, e)}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-on-surface-variant dark:text-on-surface-variant-dark hover:text-error dark:hover:text-error-dark rounded transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
                  title="Dismiss notification"
                  aria-label={`Dismiss notification: ${item.title}`}
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-surface-container-lowest dark:bg-surface-container-dark border-t border-outline-variant/40 dark:border-outline-variant-dark/40 flex items-center justify-between text-[11px]">
        <span className="text-on-surface-variant dark:text-on-surface-variant-dark px-2">
          Real-time WebSocket & SNS alerts
        </span>
        <button
          onClick={() => {
            navigate('/conflicts');
            onClose();
          }}
          className="font-semibold text-primary dark:text-primary-dark hover:underline px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          View Conflicts &rarr;
        </button>
      </div>
    </div>
  );
};
