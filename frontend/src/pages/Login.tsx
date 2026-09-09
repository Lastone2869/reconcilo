import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCheck, KeyRound, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { UserRole } from '@reconcilo/shared';
import { useAuthStore } from '../stores/auth.store.js';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('staff@reconcilo.com');
  const [password, setPassword] = useState('password123');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.STORE_STAFF);
  const [loading, setLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const rolePresets: Array<{ role: UserRole; email: string; label: string; desc: string }> = [
    {
      role: UserRole.STORE_STAFF,
      email: 'staff@reconcilo.com',
      label: 'Store Staff',
      desc: 'POS register, sales, offline queue',
    },
    {
      role: UserRole.STORE_MANAGER,
      email: 'manager@reconcilo.com',
      label: 'Store Manager',
      desc: 'Dashboard, conflicts, shift reports',
    },
    {
      role: UserRole.ADMIN,
      email: 'admin@reconcilo.com',
      label: 'HQ Admin',
      desc: 'Global inventory, DLQ, thresholds',
    },
    {
      role: UserRole.SUPPLIER,
      email: 'supplier@reconcilo.com',
      label: 'Supplier Partner',
      desc: 'Restock orders, ASN manifests',
    },
  ];

  const handleRoleSelect = (preset: typeof rolePresets[0]) => {
    setSelectedRole(preset.role);
    setEmail(preset.email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      login(
        {
          user_id: `user-${selectedRole.toLowerCase()}-01`,
          email,
          name: email.split('@')[0].toUpperCase(),
          role: selectedRole,
          store_id: selectedRole === UserRole.ADMIN || selectedRole === UserRole.SUPPLIER ? null : 'store-001',
        },
        `stub-jwt-token-${selectedRole}`
      );

      setLoading(false);
      if (selectedRole === UserRole.STORE_STAFF) navigate('/pos');
      else if (selectedRole === UserRole.SUPPLIER) navigate('/supplier');
      else navigate('/dashboard');
    }, 600);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden bg-surface dark:bg-surface-dark">
      {/* Blurred decorative orbs per design.md §5.1 */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary-container/40 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-secondary-container/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-tertiary-container/30 blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-md glass-panel p-8 rounded-2xl shadow-glass border border-outline-variant/50">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <img
              src="/logo.png"
              alt="Reconcilo Logo"
              className="h-16 max-w-[260px] w-auto object-contain mx-auto drop-shadow-sm dark:hidden"
            />
            <img
              src="/logo-dark.png"
              alt="Reconcilo Logo"
              className="h-16 max-w-[260px] w-auto object-contain mx-auto drop-shadow-sm hidden dark:block"
            />
          </div>
          <p className="text-xs font-semibold text-primary dark:text-primary-dark tracking-wider uppercase">
            Offline-First Inventory Reconciliation System
          </p>
        </div>

        {/* Quick Role Selection Switcher */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
            Select Demo Persona & Role
          </label>
          <div className="grid grid-cols-2 gap-2">
            {rolePresets.map((preset) => (
              <button
                key={preset.role}
                type="button"
                onClick={() => handleRoleSelect(preset)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedRole === preset.role
                    ? 'border-primary bg-primary-fixed/20 text-primary dark:text-primary-dark font-semibold shadow-xs'
                    : 'border-outline-variant/50 bg-surface-container/50 text-on-surface hover:bg-surface-container'
                }`}
              >
                <p className="text-xs font-semibold leading-tight">{preset.label}</p>
                <p className="text-[10px] text-on-surface-variant line-clamp-1 mt-0.5">
                  {preset.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-on-surface dark:text-on-surface-dark mb-1">
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-container-low dark:bg-surface-container-dark border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface dark:text-on-surface-dark mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-container-low dark:bg-surface-container-dark border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            loading={loading}
          >
            <span>Sign In to Station</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <p className="mt-6 text-[11px] text-center text-on-surface-variant">
          Cognito Identity Pool Authentication &bull; AES-256 Offline Storage
        </p>
      </div>
    </div>
  );
};
