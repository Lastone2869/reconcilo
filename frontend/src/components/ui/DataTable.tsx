import React from 'react';
import { Inbox } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = 'No records found',
  loading = false,
}: DataTableProps<T>) {
  return (
    <div className="w-full overflow-x-auto border border-outline-variant/50 dark:border-outline-variant-dark/50 rounded-lg">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-surface-container-low dark:bg-surface-container-low-dark border-b border-outline-variant/60 dark:border-outline-variant-dark/60">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-on-surface-variant-dark ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                } ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/30 dark:divide-outline-variant-dark/30 bg-surface-container-lowest dark:bg-surface-container-dark">
          {loading ? (
            Array.from({ length: 4 }).map((_, rIdx) => (
              <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                {columns.map((col, cIdx) => (
                  <td key={`skeleton-col-${cIdx}`} className={`py-3.5 px-4 ${col.className || ''}`}>
                    <div
                      className={`h-4 bg-surface-container dark:bg-surface-container-high-dark/60 rounded ${
                        cIdx === 0 ? 'w-24' : cIdx === columns.length - 1 ? 'w-16 ml-auto' : 'w-32'
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-on-surface-variant dark:text-on-surface-variant-dark">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Inbox className="w-8 h-8 stroke-[1.2] text-outline/40 dark:text-outline-dark/40" aria-hidden="true" />
                  <p className="text-xs text-on-surface-variant dark:text-on-surface-variant-dark font-medium">
                    {emptyMessage}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="hover:bg-surface-container-low/60 dark:hover:bg-surface-container-high-dark/40 transition-colors"
              >
                {columns.map((col, colIdx) => {
                  const content =
                    typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : col.accessor
                      ? row[col.accessor]
                      : null;

                  return (
                    <td
                      key={colIdx}
                      className={`py-3 px-4 text-sm text-on-surface dark:text-on-surface-dark ${
                        col.align === 'right' ? 'text-right tabular-nums' : col.align === 'center' ? 'text-center' : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
