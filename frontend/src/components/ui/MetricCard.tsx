import React from 'react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  iconBg?: string;
  subtitle?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  delta,
  deltaType = 'neutral',
  icon,
  iconBg = 'bg-primary-container text-primary-on-container',
  subtitle,
  className = '',
}) => {
  const deltaColors = {
    positive: 'text-primary dark:text-primary-dark bg-primary-fixed/30 dark:bg-primary-container-dark/30',
    negative: 'text-error bg-error-container/40 dark:bg-error-container-dark/40',
    neutral: 'text-on-surface-variant dark:text-on-surface-variant-dark bg-surface-container dark:bg-surface-container-high-dark',
  };

  return (
    <div
      className={`bg-surface-container-lowest dark:bg-surface-container-dark border border-outline-variant/60 dark:border-outline-variant-dark/60 rounded-xl p-5 shadow-soft hover:shadow-card transition-all ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark">
          {title}
        </span>
        {icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold font-display tracking-tight text-on-surface dark:text-on-surface-dark tabular-nums">
          {value}
        </span>
        {delta && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${deltaColors[deltaType]}`}>
            {delta}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-on-surface-variant dark:text-on-surface-variant-dark">
          {subtitle}
        </p>
      )}
    </div>
  );
};
