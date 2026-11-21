import React from 'react';
import { CheckCircle2, Clock, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';

export type SyncStateVariant = 'synced' | 'pending' | 'reconciling' | 'conflict' | 'suspicious';

export interface StatusPillProps {
  status: SyncStateVariant | string;
  label?: string;
  pulse?: boolean;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  label,
  pulse = false,
  className = '',
}) => {
  const norm = status.toLowerCase();

  let config: { bg: string; border: string; text: string; defaultLabel: string; icon: React.ReactNode } = {
    bg: 'bg-[#EBF7EB] dark:bg-emerald-950/40',
    border: 'border-[#C4E8C2] dark:border-emerald-700/60',
    text: 'text-[#266838] dark:text-emerald-300',
    defaultLabel: 'Synced',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  };

  if (norm.includes('pending') || norm.includes('offline')) {
    config = {
      bg: 'bg-[#FFF9E6] dark:bg-amber-950/40',
      border: 'border-[#FFE7A3] dark:border-amber-700/60',
      text: 'text-[#8D6208] dark:text-amber-300',
      defaultLabel: 'Pending Sync',
      icon: <Clock className="w-3.5 h-3.5" />,
    };
  } else if (norm.includes('syncing') || norm.includes('reconcil') || norm.includes('process')) {
    config = {
      bg: 'bg-[#F5F0FE] dark:bg-purple-950/40',
      border: 'border-[#E1D0FD] dark:border-purple-700/60',
      text: 'text-[#4D25B8] dark:text-purple-300',
      defaultLabel: 'Reconciling',
      icon: <RefreshCw className={`w-3.5 h-3.5 ${pulse ? 'animate-spin' : ''}`} />,
    };
  } else if (norm.includes('conflict') || norm.includes('fail') || norm.includes('error')) {
    config = {
      bg: 'bg-[#FEECEE] dark:bg-rose-950/40',
      border: 'border-[#FFD1E0] dark:border-rose-700/60',
      text: 'text-[#A72638] dark:text-rose-300',
      defaultLabel: 'Conflict',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    };
  } else if (norm.includes('flag') || norm.includes('suspicious') || norm.includes('attention')) {
    config = {
      bg: 'bg-secondary-container dark:bg-secondary-container-dark',
      border: 'border-secondary-fixed-dim dark:border-secondary-container-dark',
      text: 'text-secondary-on-container dark:text-secondary-on-container-dark',
      defaultLabel: 'Flagged',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
    };
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.border} ${config.text} ${className}`}
    >
      {config.icon}
      <span>{label || config.defaultLabel}</span>
    </span>
  );
};
