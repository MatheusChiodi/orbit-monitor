import type { TFunction } from 'i18next';
import type { Condition, FieldDisplay, PreviewResult } from '@/shared/api/types';
import { fieldKindOf, type FieldKind } from '../../conditions';
import { humanizeLabel, systemFieldKey } from '../../display';
import { conditionFieldsFor, isPreviewable, type MonitorKind } from '../../form';
import type { ConditionField } from '../ConditionEditor';

export type StepId = 'target' | 'data' | 'conditions' | 'review';

/** Kinds without a preview have nothing to pick in "Data". */
export function stepsFor(kind: MonitorKind): StepId[] {
  return isPreviewable(kind) ? ['target', 'data', 'conditions', 'review'] : ['target', 'conditions', 'review'];
}

const BUILT_IN: Partial<Record<MonitorKind, string[]>> = {
  SQL: ['[ROWS]', '[EXEC_TIME]'],
  HTTP: ['[STATUS]', '[RESPONSE_TIME]'],
};

const FORMAT_KIND: Partial<Record<FieldDisplay['format'], FieldKind>> = {
  integer: 'number',
  decimal: 'number',
  currency: 'number',
  percent: 'number',
  duration: 'duration',
  relative: 'date',
};

/**
 * Values a rule can watch: the kind's built-in values, every field of the preview (kept or not) and any
 * field a saved rule already uses, each with its friendly name and type.
 */
export function conditionFields(
  kind: MonitorKind,
  fields: readonly FieldDisplay[],
  conditions: readonly Condition[],
  preview: PreviewResult | null,
  t: TFunction,
): ConditionField[] {
  const keys = [...(BUILT_IN[kind] ?? conditionFieldsFor(kind)), ...fields.map((f) => f.field), ...conditions.map((c) => c.field)];
  const unique = [...new Set(keys.filter(Boolean))];
  return unique.map((key) => {
    const field = fields.find((f) => f.field === key);
    const system = systemFieldKey(key);
    const label = field?.label || (system ? t(`monitorForm.fieldNames.${system}`, { defaultValue: humanizeLabel(key) }) : humanizeLabel(key));
    const fromPreview = preview?.columns.some((c) => c.name === key);
    let kind: FieldKind;
    if (system || fromPreview) kind = fieldKindOf(key, preview?.columns ?? []);
    else if (field) kind = FORMAT_KIND[field.format] ?? 'text';
    else kind = conditions.some((c) => c.field === key && /^-?\d+(\.\d+)?$/.test(c.value.trim())) ? 'number' : 'text';
    return { key, label, kind };
  });
}
