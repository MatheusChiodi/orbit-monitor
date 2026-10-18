import { DEFAULT_LOCALE, messages, type Locale } from '@/shared/i18n/i18n';

/** Field formats chosen in the "Data & display" step (docs/02-features.md, 2.3). */
export type FieldFormat = 'integer' | 'decimal' | 'currency' | 'percent' | 'duration' | 'relative' | 'text';

const EMPTY = '—';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Intl uses non-breaking spaces; normalize them so text stays predictable. */
function normalizeSpaces(text: string): string {
  return text.replace(/[  ]/g, ' ');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Fills `{{name}}` placeholders of a locale phrase. */
function fill(template: string, params: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => params[key] ?? '');
}

export function formatInteger(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(value));
}

export function formatDecimal(value: number, decimals = 1, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Formats a number with up to `maxDecimals` decimals (used for rule limits). */
export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE, maxDecimals = 2): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxDecimals }).format(value);
}

export function formatCurrency(value: number, locale: Locale = DEFAULT_LOCALE, currency = 'BRL'): string {
  return normalizeSpaces(new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value));
}

/** Takes the value already in percentage points (2.5 → "2.5%"). */
export function formatPercent(value: number, decimals = 0, locale: Locale = DEFAULT_LOCALE): string {
  const text = decimals > 0 ? formatDecimal(value, decimals, locale) : formatInteger(value, locale);
  return `${text}%`;
}

/** Compact, language-neutral duration: "850ms", "12s", "4min 01s", "1h 05min", "2d 3h". */
export function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  if (ms < SECOND) return `${Math.round(ms)}ms`;
  const totalSeconds = Math.floor(ms / SECOND);
  if (ms < MINUTE) return `${totalSeconds}s`;
  if (ms < HOUR) {
    return `${Math.floor(totalSeconds / 60)}min ${pad2(totalSeconds % 60)}s`;
  }
  if (ms < DAY) {
    const totalMinutes = Math.floor(totalSeconds / 60);
    return `${Math.floor(totalMinutes / 60)}h ${pad2(totalMinutes % 60)}min`;
  }
  const totalHours = Math.floor(ms / HOUR);
  return `${Math.floor(totalHours / 24)}d ${totalHours % 24}h`;
}

/** Precise elapsed time used by the hero: "4min 01s ago" / "há 4min 01s". */
export function formatElapsed(since: Date | string, now: Date = new Date(), locale: Locale = DEFAULT_LOCALE): string {
  const duration = formatDuration(now.getTime() - toDate(since).getTime());
  return fill(messages(locale).time.ago, { duration });
}

/** Coarse relative date used by fields: "now", "12 min ago", "3 h ago", "2 d ago". */
export function formatRelative(value: Date | string, now: Date = new Date(), locale: Locale = DEFAULT_LOCALE): string {
  const diff = now.getTime() - toDate(value).getTime();
  const phrases = messages(locale).time;
  if (diff < MINUTE) return phrases.now;
  let duration: string;
  if (diff < HOUR) duration = `${Math.floor(diff / MINUTE)} min`;
  else if (diff < DAY) duration = `${Math.floor(diff / HOUR)} h`;
  else duration = `${Math.floor(diff / DAY)} d`;
  return fill(phrases.ago, { duration });
}

export function formatTime(value: Date | string): string {
  const d = toDate(value);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatClock(value: Date | string): string {
  const d = toDate(value);
  return `${formatTime(d)}:${pad2(d.getSeconds())}`;
}

export interface FormatOptions {
  format: FieldFormat;
  decimals?: number;
  unit?: string;
  prefix?: string;
  suffix?: string;
  now?: Date;
  locale?: Locale;
}

function formatRaw(value: number | string, options: FormatOptions): string {
  const locale = options.locale ?? DEFAULT_LOCALE;
  if (options.format === 'text') return String(value);
  if (options.format === 'relative') return formatRelative(String(value), options.now, locale);
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  switch (options.format) {
    case 'integer':
      return formatInteger(n, locale);
    case 'decimal':
      return formatDecimal(n, options.decimals ?? 1, locale);
    case 'currency':
      return formatCurrency(n, locale);
    case 'percent':
      return formatPercent(n, options.decimals ?? 0, locale);
    case 'duration':
      return formatDuration(n);
  }
}

/** Formats a field value according to the monitor's display options. */
export function formatValue(value: number | string | null | undefined, options: FormatOptions): string {
  if (value === null || value === undefined) return EMPTY;
  const body = `${options.prefix ?? ''}${formatRaw(value, options)}${options.suffix ?? ''}`;
  return options.unit ? `${body} ${options.unit}` : body;
}
