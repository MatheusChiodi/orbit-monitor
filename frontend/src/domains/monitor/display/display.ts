import type { FieldDisplay, PreviewColumn, PreviewResult } from '@/shared/api/types';
import { DEFAULT_LOCALE, messages, type Locale } from '@/shared/i18n/i18n';
import { detectSensitive } from '@/shared/privacy/redact';

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

function sampleValue(column: PreviewColumn, preview: PreviewResult) {
  return preview.rows.map((row) => row[column.name]).find((v) => v !== null && v !== undefined);
}

/**
 * Sensitive fields (by name or sample) are never pre-selected, never stored as series and always masked
 * (data minimization, docs/04-data-protection.md §4).
 */
function columnField(column: PreviewColumn, preview: PreviewResult): FieldDisplay {
  const dataClass = detectSensitive(sampleValue(column, preview), column.name);
  const field = plainColumnField(column, preview);
  if (!dataClass) return { ...field, dataClass: null, masked: false, showOnWall: true };
  return { ...field, dataClass, masked: true, selected: false, storeAsSeries: false, showOnWall: false, format: 'text', display: 'text' };
}

function plainColumnField(column: PreviewColumn, preview: PreviewResult): FieldDisplay {
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
  return { field, selected: false, label, format, storeAsSeries: false, display: 'hidden', dataClass: null, masked: false };
}

/** `[RESPONSE_TIME]` → `RESPONSE_TIME`; null for columns and JSON paths. */
export function systemFieldKey(field: string): string | null {
  return /^\[([A-Z_]+)\]$/.exec(field)?.[1] ?? null;
}

/** One entry per key (the HTTP preview already lists `[STATUS]`/`[RESPONSE_TIME]` as columns); first wins. */
export function dedupeFields(fields: readonly FieldDisplay[]): FieldDisplay[] {
  const seen = new Set<string>();
  return fields.filter((f) => (seen.has(f.field) ? false : (seen.add(f.field), true)));
}

/**
 * Step 1 of "Data & display": fields with suggested label, format and display.
 * System field labels are written in the operator's language because they are saved as labels.
 */
export function suggestFields(preview: PreviewResult, kind: 'SQL' | 'HTTP', locale: Locale = DEFAULT_LOCALE): FieldDisplay[] {
  const labels = messages(locale).fields.system;
  const fields = preview.columns.map((column) => columnField(column, preview));
  const system: [string, string, FieldDisplay['format']][] =
    kind === 'SQL'
      ? [['[ROWS]', labels.rows, 'integer'], ['[EXEC_TIME]', labels.execTime, 'duration']]
      : [['[STATUS]', labels.status, 'integer'], ['[RESPONSE_TIME]', labels.responseTime, 'duration']];
  for (const [field, label, format] of system) {
    const index = fields.findIndex((f) => f.field === field);
    // A built-in value the probe already returned keeps its column (selected) with the friendly label.
    if (index >= 0) fields[index] = { ...fields[index]!, label, format, storeAsSeries: field !== '[STATUS]' };
    else fields.push(systemField(field, label, format));
  }
  return dedupeFields(fields);
}

/** A new preview keeps what the operator already chose for a field (edit mode); fields it no longer returns stay at the end. */
export function mergeSuggested(current: readonly FieldDisplay[], suggested: readonly FieldDisplay[]): FieldDisplay[] {
  const merged = suggested.map((s) => current.find((c) => c.field === s.field) ?? s);
  return [...merged, ...current.filter((c) => !suggested.some((s) => s.field === c.field))];
}

/** FE-35: a JSONPath picked in the response explorer becomes (or re-selects) a field; sensitive rules still apply. */
export function addPickedField(
  fields: readonly FieldDisplay[],
  pick: { path: string; type: PreviewColumn['type'] },
  preview: PreviewResult,
): FieldDisplay[] {
  if (fields.some((f) => f.field === pick.path)) {
    return fields.map((f) => (f.field === pick.path && !f.masked ? { ...f, selected: true } : f));
  }
  return [...fields, columnField({ name: pick.path, type: pick.type }, preview)];
}
