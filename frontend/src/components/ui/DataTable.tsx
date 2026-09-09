import React from 'react';

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
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-on-surface-variant">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Loading records...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-on-surface-variant">
                {emptyMessage}
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
