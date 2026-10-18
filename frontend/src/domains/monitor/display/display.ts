import type { FieldDisplay, PreviewColumn, PreviewResult } from '@/shared/api/types';
import { DEFAULT_LOCALE, messages, type Locale } from '@/shared/i18n/i18n';

/** How the result is read (docs/02-features.md, section 2.2); labels live under `readMode.*`. */
export type ReadMode = 'single' | 'indicators' | 'ranking' | 'series' | 'table' | 'rowcount';

/** PENDING_QTY → "Pending qty"; $.queue.size → "Size". */
export function humanizeLabel(field: string): string {
  const last = field.startsWith('$') ? (field.split('.').at(-1) ?? field) : field;
  const words = last.replace(/[\[\]*]/g, '').replace(/[_\-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function suggestReadMode(preview: PreviewResult): ReadMode {
  const { columns, rows } = preview;
  if (rows.length === 0) return 'rowcount';
  const numbers = columns.filter((c) => c.type === 'number');
  const texts = columns.filter((c) => c.type === 'text');
  if (rows.length === 1) {
    return columns.length === 1 && numbers.length === 1 ? 'single' : 'indicators';
  }
  if (columns.some((c) => c.type === 'date')) return 'series';
  if (texts.length === 1 && numbers.length >= 1 && texts.length + numbers.length === columns.length) return 'ranking';
  return 'table';
}

/** Column names that hold percentages (English and Portuguese abbreviations). */
function isPercentColumn(name: string): boolean {
  return /(^|_)(PCT|PERC|PERCENT|RATE|TAXA)(_|$)/i.test(name);
}

function numberField(column: PreviewColumn, preview: PreviewResult): FieldDisplay {
  const base = { field: column.name, selected: true, label: humanizeLabel(column.name), storeAsSeries: true };
  if (isPercentColumn(column.name)) return { ...base, format: 'percent', decimals: 1, display: 'number' };
  const allIntegers = preview.rows.every((row) => {
    const value = row[column.name];
    return typeof value !== 'number' || Number.isInteger(value);
  });
  return allIntegers
    ? { ...base, format: 'integer', display: 'number' }
    : { ...base, format: 'decimal', decimals: 2, display: 'number' };
}

function columnField(column: PreviewColumn, preview: PreviewResult): FieldDisplay {
  const base = { field: column.name, selected: true, label: humanizeLabel(column.name), storeAsSeries: false };
  switch (column.type) {
    case 'number':
      return numberField(column, preview);
    case 'date':
      return { ...base, format: 'relative', display: 'text' };
    case 'boolean':
      return { ...base, format: 'text', display: 'semaphore' };
    case 'text':
      return { ...base, format: 'text', display: 'text' };
  }
}

function systemField(field: string, label: string, format: FieldDisplay['format']): FieldDisplay {
  return { field, selected: false, label, format, storeAsSeries: false, display: 'hidden' };
}

/**
 * Step 1 of "Data & display": fields with suggested label, format and display.
 * System field labels are written in the operator's language because they are saved as labels.
 */
export function suggestFields(preview: PreviewResult, kind: 'SQL' | 'HTTP', locale: Locale = DEFAULT_LOCALE): FieldDisplay[] {
  const labels = messages(locale).fields.system;
  const fields = preview.columns.map((column) => columnField(column, preview));
  if (kind === 'SQL') {
    fields.push(systemField('[ROWS]', labels.rows, 'integer'), systemField('[EXEC_TIME]', labels.execTime, 'duration'));
  } else {
    fields.push(systemField('[STATUS]', labels.status, 'integer'), systemField('[RESPONSE_TIME]', labels.responseTime, 'duration'));
  }
  return fields;
}
