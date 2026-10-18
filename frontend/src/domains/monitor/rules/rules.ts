import type { Rule } from '@/shared/api/types';
import { formatInteger } from '@/shared/format';

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export function passesRule(value: number, rule: Rule): boolean {
  switch (rule.operator) {
    case '<':
      return value < rule.limit;
    case '<=':
      return value <= rule.limit;
    case '>':
      return value > rule.limit;
    case '>=':
      return value >= rule.limit;
    case '==':
      return value === rule.limit;
    case '!=':
      return value !== rule.limit;
  }
}

/** `QTD < 200` */
export function ruleText(rule: Rule): string {
  return `${rule.field} ${rule.operator} ${numberFormat.format(rule.limit)}`;
}

/** Desvio relativo ao limite: (valor - limite) / limite. Null quando o limite é zero. */
export function deviationRatio(value: number, rule: Rule): number | null {
  if (rule.limit === 0) return null;
  return (value - rule.limit) / Math.abs(rule.limit);
}

/** Texto do desvio quando a regra falha: "+75% do limite". Null quando a regra passa. */
export function deviationLabel(value: number, rule: Rule): string | null {
  if (passesRule(value, rule)) return null;
  const ratio = deviationRatio(value, rule);
  if (ratio === null) {
    const diff = value - rule.limit;
    return diff >= 0 ? `+${formatInteger(diff)} acima do limite` : `${formatInteger(diff)} abaixo do limite`;
  }
  const pct = Math.round(ratio * 100);
  return `${pct > 0 ? '+' : ''}${pct}% do limite`;
}

/**
 * Folga até a regra, em fração do limite (0.2 = 20% de folga). Negativa quando violada.
 * Null em regras de igualdade ou com limite zero, onde folga não faz sentido.
 */
export function headroom(value: number, rule: Rule): number | null {
  if (rule.limit === 0) return null;
  const limit = Math.abs(rule.limit);
  switch (rule.operator) {
    case '<':
    case '<=':
      return (rule.limit - value) / limit;
    case '>':
    case '>=':
      return (value - rule.limit) / limit;
    case '==':
    case '!=':
      return null;
  }
}
