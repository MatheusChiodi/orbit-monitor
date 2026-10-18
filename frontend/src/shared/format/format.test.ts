import { describe, expect, it } from 'vitest';
import {
  formatClock,
  formatCurrency,
  formatDecimal,
  formatDuration,
  formatElapsed,
  formatInteger,
  formatPercent,
  formatRelative,
  formatTime,
  formatValue,
} from './format';

describe('formatInteger', () => {
  it('usa separador de milhar pt-BR', () => {
    expect(formatInteger(1234567)).toBe('1.234.567');
  });
  it('arredonda decimais', () => {
    expect(formatInteger(349.6)).toBe('350');
  });
  it('mantém negativos', () => {
    expect(formatInteger(-42)).toBe('-42');
  });
});

describe('formatDecimal', () => {
  it('usa vírgula e casas fixas', () => {
    expect(formatDecimal(3.14159, 2)).toBe('3,14');
  });
  it('padrão de uma casa', () => {
    expect(formatDecimal(2)).toBe('2,0');
  });
  it('agrupa milhar', () => {
    expect(formatDecimal(12345.678, 1)).toBe('12.345,7');
  });
});

describe('formatCurrency', () => {
  it('formata em reais com espaço comum', () => {
    expect(formatCurrency(1234.5)).toBe('R$ 1.234,50');
  });
  it('formata zero', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });
});

describe('formatPercent', () => {
  it('recebe o valor já em pontos percentuais', () => {
    expect(formatPercent(15.34, 1)).toBe('15,3%');
  });
  it('padrão sem casas', () => {
    expect(formatPercent(75)).toBe('75%');
  });
});

describe('formatDuration', () => {
  it('segundos', () => {
    expect(formatDuration(12_000)).toBe('12s');
  });
  it('minutos com segundos em dois dígitos', () => {
    expect(formatDuration(241_000)).toBe('4min 01s');
  });
  it('horas com minutos', () => {
    expect(formatDuration(3_900_000)).toBe('1h 05min');
  });
  it('dias com horas', () => {
    expect(formatDuration(2 * 86_400_000 + 3 * 3_600_000)).toBe('2d 3h');
  });
  it('nunca negativo', () => {
    expect(formatDuration(-5000)).toBe('0s');
  });
  it('milissegundos abaixo de 1 s', () => {
    expect(formatDuration(850)).toBe('850ms');
  });
});

describe('formatElapsed', () => {
  const now = new Date(2026, 9, 18, 17, 10, 0);
  it('mostra "há 4min 01s"', () => {
    expect(formatElapsed(new Date(2026, 9, 18, 17, 5, 59), now)).toBe('há 4min 01s');
  });
  it('aceita ISO string', () => {
    expect(formatElapsed(new Date(2026, 9, 18, 17, 9, 15).toISOString(), now)).toBe('há 45s');
  });
});

describe('formatRelative', () => {
  const now = new Date(2026, 9, 18, 17, 10, 0);
  it('"agora" abaixo de 1 min', () => {
    expect(formatRelative(new Date(2026, 9, 18, 17, 9, 30), now)).toBe('agora');
  });
  it('"há 12 min"', () => {
    expect(formatRelative(new Date(2026, 9, 18, 16, 58, 0), now)).toBe('há 12 min');
  });
  it('"há 3 h"', () => {
    expect(formatRelative(new Date(2026, 9, 18, 14, 5, 0), now)).toBe('há 3 h');
  });
  it('"há 2 d"', () => {
    expect(formatRelative(new Date(2026, 9, 16, 17, 0, 0), now)).toBe('há 2 d');
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

describe('formatValue (dispatcher por formato de campo)', () => {
  const now = new Date(2026, 9, 18, 17, 10, 0);
  it('inteiro', () => {
    expect(formatValue(1500, { format: 'integer' })).toBe('1.500');
  });
  it('decimal com casas', () => {
    expect(formatValue(1.25, { format: 'decimal', decimals: 2 })).toBe('1,25');
  });
  it('moeda', () => {
    expect(formatValue(10, { format: 'currency' })).toBe('R$ 10,00');
  });
  it('percentual', () => {
    expect(formatValue(2.5, { format: 'percent', decimals: 1 })).toBe('2,5%');
  });
  it('duração em ms', () => {
    expect(formatValue(61_000, { format: 'duration' })).toBe('1min 01s');
  });
  it('data relativa', () => {
    expect(formatValue(new Date(2026, 9, 18, 16, 58).toISOString(), { format: 'relative', now })).toBe(
      'há 12 min',
    );
  });
  it('texto', () => {
    expect(formatValue('UP', { format: 'text' })).toBe('UP');
  });
  it('nulo vira travessão', () => {
    expect(formatValue(null, { format: 'integer' })).toBe('—');
  });
  it('aplica prefixo, sufixo e unidade', () => {
    expect(formatValue(349, { format: 'integer', unit: 'QTD' })).toBe('349 QTD');
    expect(formatValue(7, { format: 'integer', prefix: '#', suffix: 'x' })).toBe('#7x');
  });
});
