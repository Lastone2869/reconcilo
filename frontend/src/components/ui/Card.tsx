import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  headerWash?: boolean;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  headerWash = false,
  title,
  subtitle,
  action,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-surface-container-lowest dark:bg-surface-container-dark border border-outline-variant/60 dark:border-outline-variant-dark/60 rounded-xl shadow-soft overflow-hidden ${className}`}
      {...props}
    >
      {headerWash && <div className="h-1.5 brand-gradient w-full" />}
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 dark:border-outline-variant-dark/30">
          <div>
            {title && (
              <h3 className="text-base font-semibold font-display text-on-surface dark:text-on-surface-dark">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};
