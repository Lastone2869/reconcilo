import React from 'react';
import { Search } from 'lucide-react';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (val: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search inventory, SKU, transactions...',
  value,
  onChange,
  className = '',
  ...props
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3.5 w-4 h-4 text-outline" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 h-10 text-sm bg-surface-container-low dark:bg-surface-container-dark border border-outline-variant/80 dark:border-outline-variant-dark rounded-lg text-on-surface dark:text-on-surface-dark placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        {...props}
      />
    </div>
  );
};
