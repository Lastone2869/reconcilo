import React, { useState } from 'react';
import { Users, Shield, CheckCircle2, Plus, Pencil } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { StatusPill } from '../components/ui/StatusPill.js';
import { UserRole } from '@reconcilo/shared';

interface TeamMember {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  store: string;
  status: 'ACTIVE' | 'INACTIVE';
  last_active: string;
}

export const TeamAccessPage: React.FC = () => {
  const [members] = useState<TeamMember[]>([
    {
      user_id: 'user-staff-01',
      name: 'Staff Operator',
      email: 'staff@reconcilo.com',
      role: UserRole.STORE_STAFF,
      store: 'Downtown Flagship #001',
      status: 'ACTIVE',
      last_active: '2 mins ago',
    },
    {
      user_id: 'user-manager-01',
      name: 'Store Manager',
      email: 'manager@reconcilo.com',
      role: UserRole.STORE_MANAGER,
      store: 'Downtown Flagship #001',
      status: 'ACTIVE',
      last_active: '15 mins ago',
    },
    {
      user_id: 'user-admin-01',
      name: 'HQ Administrator',
      email: 'admin@reconcilo.com',
      role: UserRole.ADMIN,
      store: 'All Stores (HQ)',
      status: 'ACTIVE',
      last_active: 'Just now',
    },
    {
      user_id: 'user-supplier-01',
      name: 'Supplier Partner',
      email: 'supplier@reconcilo.com',
      role: UserRole.SUPPLIER,
      store: 'External Partner',
      status: 'ACTIVE',
      last_active: '1 hour ago',
    },
  ]);

  const roleColors: Record<string, string> = {
    [UserRole.STORE_STAFF]: 'bg-primary-container text-primary-on-container',
    [UserRole.STORE_MANAGER]: 'bg-secondary-container text-secondary-on-container',
    [UserRole.ADMIN]: 'bg-tertiary-container text-tertiary-on-container',
    [UserRole.SUPPLIER]: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark">
            Team Governance & Access Control
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
            Manage user accounts, RBAC role assignments, and Cognito group memberships (RULE-048 – RULE-051)
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Invite Team Member
        </Button>
      </div>

      <Card headerWash title="Team Directory" subtitle="Cognito User Pool group assignments and access levels">
        <div className="overflow-x-auto border border-outline-variant/40 dark:border-outline-variant-dark/40 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-container-low dark:bg-surface-container-low-dark border-b border-outline-variant/60">
              <tr>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant">User</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant">Role</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant">Store Assignment</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant text-center">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant text-right">Last Active</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-on-surface-variant text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 bg-surface-container-lowest dark:bg-surface-container-dark">
              {members.map((m) => (
                <tr key={m.user_id} className="hover:bg-surface-container-low/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-primary-on-container flex items-center justify-center font-bold text-xs">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface dark:text-on-surface-dark">{m.name}</p>
                        <p className="text-[10px] text-on-surface-variant font-mono">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${roleColors[m.role] || ''}`}>
                      <Shield className="w-3 h-3" />
                      {m.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-on-surface-variant">{m.store}</td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusPill
                      status={m.status === 'ACTIVE' ? 'synced' : 'conflict'}
                      label={m.status}
                    />
                  </td>
                  <td className="py-3.5 px-4 text-right text-on-surface-variant font-mono text-[11px]">
                    {m.last_active}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors" title="Edit role assignment">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
