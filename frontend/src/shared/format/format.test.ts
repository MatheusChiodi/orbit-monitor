import { describe, expect, it } from 'vitest';
import {
  formatClock,
  formatCurrency,
  formatDecimal,
  formatDuration,
  formatElapsed,
  formatInteger,
  formatNumber,
  formatPercent,
  formatRelative,
  formatTime,
  formatValue,
} from './format';

describe('formatInteger', () => {
  it('uses the locale thousands separator', () => {
    expect(formatInteger(1234567)).toBe('1,234,567');
    expect(formatInteger(1234567, 'pt-BR')).toBe('1.234.567');
  });
  it('rounds decimals', () => {
    expect(formatInteger(349.6)).toBe('350');
  });
  it('keeps negatives', () => {
    expect(formatInteger(-42, 'pt-BR')).toBe('-42');
  });
});

describe('formatDecimal', () => {
  it('fixed decimals with the locale decimal separator', () => {
    expect(formatDecimal(3.14159, 2)).toBe('3.14');
    expect(formatDecimal(3.14159, 2, 'pt-BR')).toBe('3,14');
  });
  it('defaults to one decimal', () => {
    expect(formatDecimal(2)).toBe('2.0');
  });
  it('groups thousands', () => {
    expect(formatDecimal(12345.678, 1, 'pt-BR')).toBe('12.345,7');
  });
});

describe('formatNumber', () => {
  it('up to two decimals', () => {
    expect(formatNumber(2.5)).toBe('2.5');
    expect(formatNumber(2.5, 'pt-BR')).toBe('2,5');
    expect(formatNumber(200)).toBe('200');
  });
});

describe('formatCurrency', () => {
  it('formats with a regular space in pt-BR', () => {
    expect(formatCurrency(1234.5, 'pt-BR')).toBe('R$ 1.234,50');
  });
  it('formats in English', () => {
    expect(formatCurrency(1234.5, 'en')).toBe('R$1,234.50');
    expect(formatCurrency(10, 'en', 'USD')).toBe('$10.00');
  });
});

describe('formatPercent', () => {
  it('takes the value already in percentage points', () => {
    expect(formatPercent(15.34, 1)).toBe('15.3%');
    expect(formatPercent(15.34, 1, 'pt-BR')).toBe('15,3%');
  });
  it('no decimals by default', () => {
    expect(formatPercent(75)).toBe('75%');
  });
});

describe('formatDuration', () => {
  it('seconds', () => {
    expect(formatDuration(12_000)).toBe('12s');
  });
  it('minutes with two-digit seconds', () => {
    expect(formatDuration(241_000)).toBe('4min 01s');
  });
  it('hours with minutes', () => {
    expect(formatDuration(3_900_000)).toBe('1h 05min');
  });
  it('days with hours', () => {
    expect(formatDuration(2 * 86_400_000 + 3 * 3_600_000)).toBe('2d 3h');
  });
  it('never negative', () => {
    expect(formatDuration(-5000)).toBe('0s');
  });
  it('milliseconds below 1 s', () => {
    expect(formatDuration(850)).toBe('850ms');
  });
});

describe('formatElapsed', () => {
  const now = new Date(2026, 9, 18, 17, 10, 0);
  it('"4min 01s ago" / "há 4min 01s"', () => {
    const since = new Date(2026, 9, 18, 17, 5, 59);
    expect(formatElapsed(since, now)).toBe('4min 01s ago');
    expect(formatElapsed(since, now, 'pt-BR')).toBe('há 4min 01s');
  });
  it('accepts an ISO string', () => {
    expect(formatElapsed(new Date(2026, 9, 18, 17, 9, 15).toISOString(), now)).toBe('45s ago');
  });
});

describe('formatRelative', () => {
  const now = new Date(2026, 9, 18, 17, 10, 0);
  it('"now" / "agora" below 1 min', () => {
    const at = new Date(2026, 9, 18, 17, 9, 30);
    expect(formatRelative(at, now)).toBe('now');
    expect(formatRelative(at, now, 'pt-BR')).toBe('agora');
  });
  it('"12 min ago" / "há 12 min"', () => {
    const at = new Date(2026, 9, 18, 16, 58, 0);
    expect(formatRelative(at, now)).toBe('12 min ago');
    expect(formatRelative(at, now, 'pt-BR')).toBe('há 12 min');
  });
  it('"3 h ago"', () => {
    expect(formatRelative(new Date(2026, 9, 18, 14, 5, 0), now)).toBe('3 h ago');
  });
  it('"há 2 d"', () => {
    expect(formatRelative(new Date(2026, 9, 16, 17, 0, 0), now, 'pt-BR')).toBe('há 2 d');
  });
});

describe('formatTime / formatClock', () => {
  const d = new Date(2026, 9, 18, 7, 4, 9);
  it('HH:MM', () => {
    expect(formatTime(d)).toBe('07:04');
  });
  it('HH:MM:SS', () => {
    expect(formatClock(d)).toBe('07:04:09');
  });
});

describe('formatValue (dispatch by field format)', () => {
  const now = new Date(2026, 9, 18, 17, 10, 0);
  it('integer', () => {
    expect(formatValue(1500, { format: 'integer' })).toBe('1,500');
    expect(formatValue(1500, { format: 'integer', locale: 'pt-BR' })).toBe('1.500');
  });
  it('decimal with places', () => {
    expect(formatValue(1.25, { format: 'decimal', decimals: 2, locale: 'pt-BR' })).toBe('1,25');
  });
  it('currency', () => {
    expect(formatValue(10, { format: 'currency', locale: 'pt-BR' })).toBe('R$ 10,00');
  });
  it('percent', () => {
    expect(formatValue(2.5, { format: 'percent', decimals: 1 })).toBe('2.5%');
  });
  it('duration in ms', () => {
    expect(formatValue(61_000, { format: 'duration' })).toBe('1min 01s');
  });
  it('relative date', () => {
    const at = new Date(2026, 9, 18, 16, 58).toISOString();
    expect(formatValue(at, { format: 'relative', now })).toBe('12 min ago');
    expect(formatValue(at, { format: 'relative', now, locale: 'pt-BR' })).toBe('há 12 min');
  });
  it('text', () => {
    expect(formatValue('UP', { format: 'text' })).toBe('UP');
  });
  it('null becomes a dash', () => {
    expect(formatValue(null, { format: 'integer' })).toBe('—');
  });
  it('applies prefix, suffix and unit', () => {
    expect(formatValue(349, { format: 'integer', unit: 'QTY' })).toBe('349 QTY');
    expect(formatValue(7, { format: 'integer', prefix: '#', suffix: 'x' })).toBe('#7x');
  });
});
