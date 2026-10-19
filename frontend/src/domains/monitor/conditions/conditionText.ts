import type { Condition, ConditionOperator, Severity } from '@/shared/api/types';
import type { MessageKey } from '@/shared/i18n/message';
import { conditionText } from './conditions';

/** Text mode of the condition builder (FE-34): one `<condition> → <LEVEL>` per line. */
export function conditionsToText(conditions: readonly Condition[]): string {
  return conditions.map((c) => `${conditionText(c)} → ${c.level}`).join('\n');
}

export interface ConditionTextError {
  line: number;
  key: MessageKey;
}

export interface ParsedConditions {
  conditions: Condition[];
  errors: ConditionTextError[];
}

const LINE =
  /^(?:\[COL\]\.([\w$#.]+)|(\[[A-Z_]+\]))\s+(older than|<=|>=|==|!=|<|>|between|in)\s+(.+?)\s*(?:→|->)\s*(WARN|DOWN)$/i;

/** Parses the text mode back into conditions; each unreadable line is reported with its number. */
export function parseConditionsText(text: string): ParsedConditions {
  const conditions: Condition[] = [];
  const errors: ConditionTextError[] = [];
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const m = LINE.exec(line);
    if (!m) {
      errors.push({ line: index + 1, key: 'conditions.errors.syntax' });
      return;
    }
    const operatorText = m[3]!.toLowerCase();
    const operator: ConditionOperator = operatorText === 'older than' ? 'older_than' : (operatorText as ConditionOperator);
    conditions.push({
      field: m[1] ?? m[2]!.toUpperCase(),
      operator,
      value: m[4]!,
      level: m[5]!.toUpperCase() as Severity,
    });
  });
  return { conditions, errors };
}
