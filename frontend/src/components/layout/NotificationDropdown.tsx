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

export interface NotificationItem {
  id: string;
  type: 'CONFLICT' | 'LOW_STOCK' | 'SUSPICIOUS' | 'SYNC' | 'RESTOCK';
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'CONFLICT',
    severity: 'HIGH',
    title: 'Oversell Conflict Detected',
    message: '2 units oversold on Compostable Cups 12oz during offline sync replay.',
    time: '4m ago',
    read: false,
    link: '/conflicts',
  },
  {
    id: 'notif-2',
    type: 'LOW_STOCK',
    severity: 'MEDIUM',
    title: 'Low Stock Warning',
    message: 'Organic Oat Milk 1L dropped to 6 units (reorder threshold: 10).',
    time: '18m ago',
    read: false,
    link: '/global-inventory',
  },
  {
    id: 'notif-3',
    type: 'SUSPICIOUS',
    severity: 'HIGH',
    title: 'Suspicious Activity Flagged',
    message: 'POS Terminal 02 recorded 3 rapid consecutive void operations.',
    time: '45m ago',
    read: false,
    link: '/suspicious-activity',
  },
  {
    id: 'notif-4',
    type: 'SYNC',
    severity: 'INFO',
    title: 'Batch Synchronization Complete',
    message: 'Batch sync-001 replayed 14 offline sales into DynamoDB without errors.',
    time: '1h ago',
    read: true,
    link: '/transactions',
  },
  {
    id: 'notif-5',
    type: 'RESTOCK',
    severity: 'INFO',
    title: 'Supplier ASN Dispatched',
    message: 'EcoPackaging Ltd has dispatched shipment for Restock PO-2026-003.',
    time: '2h ago',
    read: true,
    link: '/supplier',
  },
];

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread' | 'alerts'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const dismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
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
        return <Bell className="w-4 h-4 text-on-surface-variant" />;
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
      className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-surface dark:bg-surface-container-low-dark border border-outline-variant/60 dark:border-outline-variant-dark/60 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="p-4 border-b border-outline-variant/40 dark:border-outline-variant-dark/40 flex items-center justify-between bg-surface-container-lowest/50 dark:bg-surface-container-lowest-dark/30 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary-container text-primary-on-container">
            <Bell className="w-4 h-4" />
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
              className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container transition-colors text-xs flex items-center gap-1"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="p-1.5 text-on-surface-variant hover:text-error rounded-lg hover:bg-surface-container transition-colors text-xs"
              title="Clear all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
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
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-primary text-white font-semibold'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('alerts')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            filter === 'alerts'
              ? 'bg-primary text-white font-semibold'
              : 'text-on-surface-variant hover:bg-surface-container'
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
              onClick={() => handleNotificationClick(item)}
              className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors relative group ${
                !item.read
                  ? 'bg-primary-fixed/10 dark:bg-primary-container-dark/10 hover:bg-primary-fixed/20 dark:hover:bg-primary-container-dark/20'
                  : 'hover:bg-surface-container/60 dark:hover:bg-surface-container-high-dark/40'
              }`}
            >
              {/* Type Icon */}
              <div className={`p-2 rounded-xl flex-shrink-0 ${getIconBg(item.type)}`}>
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
                    <ExternalLink className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>

              {/* Unread indicator / dismiss */}
              <div className="flex flex-col items-center gap-2">
                {!item.read && (
                  <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0" />
                )}
                <button
                  onClick={(e) => dismissNotification(item.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-on-surface-variant hover:text-error rounded transition-opacity"
                  title="Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-surface-container-lowest dark:bg-surface-container-lowest-dark border-t border-outline-variant/40 dark:border-outline-variant-dark/40 flex items-center justify-between text-[11px]">
        <span className="text-on-surface-variant px-2">
          Real-time WebSocket & SNS alerts
        </span>
        <button
          onClick={() => {
            navigate('/conflicts');
            onClose();
          }}
          className="font-semibold text-primary dark:text-primary-dark hover:underline px-2"
        >
          View Conflicts &rarr;
        </button>
      </div>
    </div>
  );
};
