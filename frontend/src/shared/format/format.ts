/** Formatos de campo definidos no passo "Dados e exibição" (02-funcionalidades.md, 2.3). */
export type FieldFormat = 'integer' | 'decimal' | 'currency' | 'percent' | 'duration' | 'relative' | 'text';

const LOCALE = 'pt-BR';
const EMPTY = '—';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Intl usa espaço não separável; normalizamos para manter o texto previsível. */
function normalizeSpaces(text: string): string {
  return text.replace(/[  ]/g, ' ');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(Math.round(value));
}

export function formatDecimal(value: number, decimals = 1): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCurrency(value: number, currency = 'BRL'): string {
  return normalizeSpaces(new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(value));
}

/** Recebe o valor em pontos percentuais (2.5 → "2,5%"). */
export function formatPercent(value: number, decimals = 0): string {
  const text = decimals > 0 ? formatDecimal(value, decimals) : formatInteger(value);
  return `${text}%`;
}

/** Duração compacta: "850ms", "12s", "4min 01s", "1h 05min", "2d 3h". */
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

/** Tempo decorrido preciso, usado no herói: "há 4min 01s". */
export function formatElapsed(since: Date | string, now: Date = new Date()): string {
  return `há ${formatDuration(now.getTime() - toDate(since).getTime())}`;
}

/** Data relativa grosseira, usada em campos: "agora", "há 12 min", "há 3 h", "há 2 d". */
export function formatRelative(value: Date | string, now: Date = new Date()): string {
  const diff = now.getTime() - toDate(value).getTime();
  if (diff < MINUTE) return 'agora';
  if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) return `há ${Math.floor(diff / HOUR)} h`;
  return `há ${Math.floor(diff / DAY)} d`;
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
}

function formatRaw(value: number | string, options: FormatOptions): string {
  if (options.format === 'text') return String(value);
  if (options.format === 'relative') return formatRelative(String(value), options.now);
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  switch (options.format) {
    case 'integer':
      return formatInteger(n);
    case 'decimal':
      return formatDecimal(n, options.decimals ?? 1);
    case 'currency':
      return formatCurrency(n);
    case 'percent':
      return formatPercent(n, options.decimals ?? 0);
    case 'duration':
      return formatDuration(n);
  }
}

/** Formata um valor de campo segundo as opções de exibição do monitor. */
export function formatValue(value: number | string | null | undefined, options: FormatOptions): string {
  if (value === null || value === undefined) return EMPTY;
  const body = `${options.prefix ?? ''}${formatRaw(value, options)}${options.suffix ?? ''}`;
  return options.unit ? `${body} ${options.unit}` : body;
}
