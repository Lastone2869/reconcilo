import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-medium rounded-md gap-1.5',
    md: 'px-4 py-2 text-sm font-medium rounded-md gap-2',
    lg: 'px-5 py-2.5 text-base font-semibold rounded-lg gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-primary text-white hover:bg-opacity-90 active:scale-[0.98] shadow-sm transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2',
    secondary:
      'bg-secondary-container text-secondary-on-container dark:bg-secondary-container-dark dark:text-secondary-on-container-dark hover:bg-opacity-80 active:scale-[0.98] transition-all',
    tertiary:
      'bg-tertiary-container text-tertiary-on-container dark:bg-tertiary-container-dark dark:text-tertiary-on-container-dark hover:bg-opacity-80 active:scale-[0.98] transition-all',
    outline:
      'border border-outline-variant dark:border-outline-variant-dark bg-transparent text-on-surface dark:text-on-surface-dark hover:bg-surface-container-low dark:hover:bg-surface-container-dark transition-all',
    destructive:
      'bg-error text-white hover:bg-opacity-90 active:scale-[0.98] transition-all focus:ring-2 focus:ring-error',
    ghost:
      'bg-transparent text-on-surface dark:text-on-surface-dark hover:bg-surface-container dark:hover:bg-surface-container-dark transition-all',
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-sans select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};
