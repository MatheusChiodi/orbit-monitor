import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface TableColumn<R> {
  key: string;
  /** Column header; also the label of the cell in the stacked mobile layout. */
  header: string;
  cell: (row: R) => ReactNode;
  align?: 'start' | 'end';
  /** Numbers, ids, timestamps: Geist Mono with tabular figures. */
  mono?: boolean;
  /** Hidden below 640 px (`data-hide-mobile`, styled by theme.css). */
  hideOnMobile?: boolean;
  className?: string;
}

export interface TableProps<R> {
  /** Accessible name (visually hidden). */
  caption: string;
  columns: readonly TableColumn<R>[];
  rows: readonly R[];
  getRowKey: (row: R) => string;
  /** Makes rows clickable and keyboard-activatable (Enter / Space). */
  onRowClick?: (row: R) => void;
  /** Accessible name of a clickable row, e.g. "Open Checkout API". */
  rowLabel?: (row: R) => string;
  empty?: ReactNode;
  className?: string;
}

/** Data table; below 640 px each row stacks into a labelled card (`ui-table` in base.css). */
export function Table<R>({ caption, columns, rows, getRowKey, onRowClick, rowLabel, empty, className = '' }: TableProps<R>) {
  const { t } = useTranslation();
  const onKeyDown = (event: KeyboardEvent, row: R) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick?.(row);
    }
  };
  return (
    <div className={`min-w-0 overflow-x-auto rounded-md border border-line ${className}`}>
      <table className="ui-table w-full border-collapse text-left text-base">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                data-hide-mobile={column.hideOnMobile || undefined}
                className={`section-label h-9 px-3 font-semibold ${column.align === 'end' ? 'text-right' : ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-muted">
                {empty ?? t('ui.table.empty')}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (event) => onKeyDown(event, row) : undefined}
              className={`border-b border-line last:border-b-0 ${onRowClick ? 'cursor-pointer transition-colors duration-120 hover:bg-s2 focus-visible:bg-s2' : ''}`}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  data-label={column.header}
                  data-hide-mobile={column.hideOnMobile || undefined}
                  className={`h-11 px-3 py-2 text-text ${column.align === 'end' ? 'text-right' : ''} ${column.mono ? 'font-mono text-sm' : ''} ${
                    column.className ?? ''
                  }`}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
