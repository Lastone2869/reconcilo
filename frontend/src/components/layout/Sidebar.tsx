import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShoppingCart,
  LayoutDashboard,
  History,
  AlertOctagon,
  ShieldAlert,
  Layers,
  Settings,
  Boxes,
  Truck,
  FileText,
  AlertCircle,
  Users,
  PackageCheck,
  RefreshCw,
} from 'lucide-react';
import { UserRole } from '@reconcilo/shared';

export interface SidebarProps {
  role: UserRole;
  pendingSyncCount?: number;
  openConflictsCount?: number;
  suspiciousCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  pendingSyncCount = 0,
  openConflictsCount = 0,
  suspiciousCount = 0,
}) => {
  // Navigation structure categorized by domain
  const navSections = [
    {
      title: 'Store Operations',
      roles: [UserRole.STORE_STAFF, UserRole.STORE_MANAGER, UserRole.ADMIN],
      items: [
        {
          label: 'POS Terminal',
          path: '/pos',
          icon: <ShoppingCart className="w-4 h-4" />,
        },
        {
          label: 'Offline Queue',
          path: '/pending-transactions',
          icon: <RefreshCw className="w-4 h-4" />,
          badge: pendingSyncCount > 0 ? pendingSyncCount : null,
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        },
        {
          label: 'Store Dashboard',
          path: '/dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />,
          roles: [UserRole.STORE_MANAGER, UserRole.ADMIN],
        },
        {
          label: 'Transaction History',
          path: '/transactions',
          icon: <History className="w-4 h-4" />,
          roles: [UserRole.STORE_MANAGER, UserRole.ADMIN],
        },
      ],
    },
    {
      title: 'Reconciliation',
      roles: [UserRole.STORE_MANAGER, UserRole.ADMIN],
      items: [
        {
          label: 'Conflicts',
          path: '/conflicts',
          icon: <AlertOctagon className="w-4 h-4" />,
          badge: openConflictsCount > 0 ? openConflictsCount : null,
          badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
        },
        {
          label: 'Suspicious Activity',
          path: '/suspicious-activity',
          icon: <ShieldAlert className="w-4 h-4" />,
          badge: suspiciousCount > 0 ? suspiciousCount : null,
          badgeColor: 'bg-secondary-container text-secondary-on-container',
        },
        {
          label: 'Shift Reports',
          path: '/store-reports',
          icon: <FileText className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'HQ Multi-Store',
      roles: [UserRole.ADMIN],
      items: [
        {
          label: 'HQ Overview',
          path: '/hq',
          icon: <Layers className="w-4 h-4" />,
        },
        {
          label: 'Global Inventory',
          path: '/global-inventory',
          icon: <Boxes className="w-4 h-4" />,
        },
        {
          label: 'Stock Transfers',
          path: '/stock-transfer',
          icon: <Truck className="w-4 h-4" />,
        },
        {
          label: 'DLQ Dead Letter',
          path: '/dlq',
          icon: <AlertCircle className="w-4 h-4" />,
        },
        {
          label: 'Team Governance',
          path: '/team-access',
          icon: <Users className="w-4 h-4" />,
        },
        {
          label: 'Rule Thresholds',
          path: '/settings',
          icon: <Settings className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'Supplier Portal',
      roles: [UserRole.SUPPLIER, UserRole.ADMIN],
      items: [
        {
          label: 'Restock Portal',
          path: '/supplier',
          icon: <PackageCheck className="w-4 h-4" />,
        },
      ],
    },
  ];

  return (
    <aside className="w-64 h-screen bg-surface-container dark:bg-surface-container-low-dark border-r border-outline-variant/40 dark:border-outline-variant-dark/40 flex flex-col flex-shrink-0 select-none">
      {/* Brand Header with transparent logo */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-outline-variant/40 dark:border-outline-variant-dark/40">
        <NavLink to="/dashboard" className="flex items-center gap-2 w-full py-1 hover:opacity-90 transition-opacity" title="Reconcilo Dashboard">
          <img
            src="/logo.png"
            alt="Reconcilo Logo"
            className="h-9 max-w-[195px] w-auto object-contain dark:hidden"
          />
          <img
            src="/logo-dark.png"
            alt="Reconcilo Logo"
            className="h-9 max-w-[195px] w-auto object-contain hidden dark:block"
          />
        </NavLink>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {navSections
          .filter((section) => section.roles.includes(role))
          .map((section, idx) => (
            <div key={idx}>
              <h2 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark mb-2">
                {section.title}
              </h2>
              <div className="space-y-1">
                {section.items
                  .filter((item) => !item.roles || item.roles.includes(role))
                  .map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-primary-container text-primary-on-container dark:bg-primary-container-dark dark:text-primary-dark font-semibold shadow-xs'
                            : 'text-on-surface dark:text-on-surface-dark hover:bg-surface-container-high/60 dark:hover:bg-surface-container-high-dark/60'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge !== null && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.badgeColor || 'bg-primary text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
              </div>
            </div>
          ))}
      </nav>
    </aside>
  );
};
