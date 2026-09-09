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
    bg: 'bg-[#EBF7EB]',
    border: 'border-[#C4E8C2]',
    text: 'text-[#266838]',
    defaultLabel: 'Synced',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  };

  if (norm.includes('pending') || norm.includes('offline')) {
    config = {
      bg: 'bg-[#FFF9E6]',
      border: 'border-[#FFE7A3]',
      text: 'text-[#8D6208]',
      defaultLabel: 'Pending Sync',
      icon: <Clock className="w-3.5 h-3.5" />,
    };
  } else if (norm.includes('syncing') || norm.includes('reconcil') || norm.includes('process')) {
    config = {
      bg: 'bg-[#F5F0FE]',
      border: 'border-[#E1D0FD]',
      text: 'text-[#4D25B8]',
      defaultLabel: 'Reconciling',
      icon: <RefreshCw className={`w-3.5 h-3.5 ${pulse ? 'animate-spin' : ''}`} />,
    };
  } else if (norm.includes('conflict') || norm.includes('fail') || norm.includes('error')) {
    config = {
      bg: 'bg-[#FEECEE]',
      border: 'border-[#FFD1E0]',
      text: 'text-[#A72638]',
      defaultLabel: 'Conflict',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    };
  } else if (norm.includes('flag') || norm.includes('suspicious') || norm.includes('attention')) {
    config = {
      bg: 'bg-secondary-container',
      border: 'border-secondary-fixed-dim',
      text: 'text-secondary-on-container',
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
