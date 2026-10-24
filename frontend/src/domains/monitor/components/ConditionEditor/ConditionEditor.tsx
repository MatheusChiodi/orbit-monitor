import type { ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import type { Condition, Severity } from '@/shared/api/types';
import { translate } from '@/shared/i18n/message';
import { AnimatedItem, Button, IconClose, IconButton, IconPlus, Select, TextInput } from '@/shared/ui';
import {
  alertOperatorsFor,
  defaultAlertOperator,
  evaluateCondition,
  splitRange,
  joinRange,
  toAlertOperator,
  toStoredOperator,
  validateCondition,
  type AlertOperator,
  type EvaluationContext,
  type FieldKind,
} from '../../conditions';

/** A value a rule can watch, with its friendly name and type. */
export interface ConditionField {
  key: string;
  label: string;
  kind: FieldKind;
}

export interface ConditionEditorProps {
  conditions: readonly Condition[];
  fields: readonly ConditionField[];
  /** Current preview result for the live verdict; null before the preview. */
  context: EvaluationContext | null;
  onChange: (conditions: Condition[]) => void;
  /** Why "Add rule" is unavailable (no field to watch yet). */
  addDisabledReason?: string;
}

const LEVELS: Severity[] = ['DOWN', 'WARN'];

/** The verdict text cross-fades when it changes ("would fail" ↔ "passes"). */
function Verdict({ id, children }: { id: string; children: ReactNode }) {
  const fade = useMotionPreset('status');
  return (
    <span className="inline-grid">
      <AnimatePresence initial={false}>
        <m.span
          key={id}
          className="col-start-1 row-start-1"
          initial={fade.level === 'off' ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fade.transition}
        >
          {children}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

function LiveResult({ condition, keys, context }: { condition: Condition; keys: readonly string[]; context: EvaluationContext | null }) {
  const { t } = useTranslation();
  const error = validateCondition(condition, keys);
  if (error) return <Verdict id="error"><span className="text-down-text">{translate(t, error)}</span></Verdict>;
  if (!context) return null;
  const result = evaluateCondition(condition, context);
  if (result === 'invalid') return <Verdict id="invalid"><span className="text-muted">{t('conditions.cannotEvaluate')}</span></Verdict>;
  if (result === 'fail') {
    return (
      <Verdict id={`fail-${condition.level}`}>
        <span className={condition.level === 'DOWN' ? 'text-down-text' : 'text-warn-text'}>
          {t('conditions.wouldFail', { level: t(`conditions.levels.${condition.level}`) })}
        </span>
      </Verdict>
    );
  }
  return (
    <Verdict id="pass">
      <span className="text-ok-text">{t('conditions.passes')}</span>
    </Verdict>
  );
}

/** "Down when Response time is above 1000 ms": the rule as one sentence. */
export function useConditionSentence() {
  const { t } = useTranslation();
  return (condition: Condition, fields: readonly ConditionField[]): string => {
    const field = fields.find((f) => f.key === condition.field);
    const operator = toAlertOperator(condition.operator);
    const withUnit = (v: string) => (field?.kind === 'duration' && /^\d+(\.\d+)?$/.test(v.trim()) ? `${v.trim()} ms` : v.trim());
    let value = withUnit(condition.value);
    if (operator === 'outside') {
      const [min, max] = splitRange(condition.value) ?? ['', ''];
      value = t('monitorForm.rules.range', { min: withUnit(min), max: withUnit(max) });
    } else if (operator === 'not_in') value = condition.value.trim().replace(/^\((.*)\)$/, '$1');
    return t('monitorForm.rules.sentence', {
      level: t(`conditions.levels.${condition.level}`),
      field: field?.label ?? condition.field,
      operator: t(`monitorForm.rules.operators.${operator}`),
      value,
    });
  };
}

function ValueInput({ condition, field, onValue }: { condition: Condition; field: ConditionField | undefined; onValue: (value: string) => void }) {
  const { t } = useTranslation();
  const operator = toAlertOperator(condition.operator);
  const unit = field?.kind === 'duration' ? <span className="text-sm text-muted">ms</span> : null;
  if (operator === 'outside') {
    const [min, max] = splitRange(condition.value) ?? ['', ''];
    return (
      <span className="flex min-w-0 items-center gap-2">
        <TextInput aria-label={t('monitorForm.rules.min')} inputMode="decimal" className="font-mono" value={min} onChange={(e) => onValue(joinRange(e.target.value, max))} />
        <span className="text-sm text-muted">–</span>
        <TextInput aria-label={t('monitorForm.rules.max')} inputMode="decimal" className="font-mono" value={max} onChange={(e) => onValue(joinRange(min, e.target.value))} />
        {unit}
      </span>
    );
  }
  const list = operator === 'not_in';
  return (
    <span className="flex min-w-0 items-center gap-2">
      <TextInput
        aria-label={t('monitorForm.rules.value')}
        className="font-mono"
        inputMode={field?.kind === 'number' || field?.kind === 'duration' ? 'decimal' : undefined}
        placeholder={list ? 'UP, OK' : operator === 'older' ? t('monitorForm.rules.durationHint') : undefined}
        title={list ? t('monitorForm.rules.listHint') : undefined}
        value={list ? condition.value.replace(/^\((.*)\)$/, '$1') : condition.value}
        onChange={(e) => onValue(e.target.value)}
      />
      {unit}
    </span>
  );
}

/** Rules as "<Level> when <value> <comparison> <limit>", each with its sentence and the verdict against the preview. */
export function ConditionEditor({ conditions, fields, context, onChange, addDisabledReason }: ConditionEditorProps) {
  const { t } = useTranslation();
  const sentence = useConditionSentence();
  const keys = fields.map((f) => f.key);

  function update(index: number, patch: Partial<Condition>) {
    onChange(conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function changeField(index: number, key: string) {
    const kind = fields.find((f) => f.key === key)?.kind ?? 'text';
    const current = toAlertOperator(conditions[index]!.operator);
    const operator = alertOperatorsFor(kind).includes(current) ? conditions[index]!.operator : toStoredOperator(defaultAlertOperator(kind));
    update(index, { field: key, operator });
  }

  function add() {
    const first = fields.find((f) => !conditions.some((c) => c.field === f.key)) ?? fields[0];
    if (!first) return;
    onChange([...conditions, { field: first.key, operator: toStoredOperator(defaultAlertOperator(first.kind)), value: '', level: 'DOWN' }]);
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence>
        {conditions.map((condition, index) => {
          const field = fields.find((f) => f.key === condition.field);
          const operators = alertOperatorsFor(field?.kind ?? 'text');
          const alert = toAlertOperator(condition.operator);
          const shown: AlertOperator[] = operators.includes(alert) ? operators : [alert, ...operators];
          return (
            <AnimatedItem
              as="div"
              key={index}
              role="group"
              aria-label={t('monitorForm.rules.rule', { n: index + 1 })}
              className="flex flex-col gap-2 rounded-md border border-line bg-s2 p-3"
            >
              <div className="grid grid-cols-2 items-center gap-2 md:flex">
                <span className="md:w-32 md:shrink-0">
                <Select aria-label={t('monitorForm.rules.level')} value={condition.level} onChange={(e) => update(index, { level: e.target.value as Severity })}>
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {t(`conditions.levels.${level}`)}
                    </option>
                  ))}
                </Select>
                </span>
                <span className="hidden text-sm text-muted md:inline">{t('monitorForm.rules.when')}</span>
                <span className="min-w-0 md:w-56 md:shrink-0">
                <Select aria-label={t('monitorForm.rules.field')} value={condition.field} onChange={(e) => changeField(index, e.target.value)}>
                  {!field && <option value={condition.field}>{condition.field || '—'}</option>}
                  {fields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </Select>
                </span>
                <span className="min-w-0 md:w-40 md:shrink-0">
                <Select
                  aria-label={t('monitorForm.rules.operator')}
                  value={alert}
                  onChange={(e) => update(index, { operator: toStoredOperator(e.target.value as AlertOperator) })}
                >
                  {shown.map((op) => (
                    <option key={op} value={op}>
                      {t(`monitorForm.rules.operators.${op}`)}
                    </option>
                  ))}
                </Select>
                </span>
                <span className="min-w-0 md:flex-1">
                  <ValueInput condition={condition} field={field} onValue={(value) => update(index, { value })} />
                </span>
                <IconButton
                  className="col-span-2 justify-self-end"
                  label={t('monitorForm.rules.remove', { n: index + 1 })}
                  icon={IconClose}
                  size="sm"
                  onClick={() => onChange(conditions.filter((_, i) => i !== index))}
                />
              </div>
              <p className="m-0 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                <span className="text-muted">{sentence(condition, fields)}</span>
                <span aria-live="polite">
                  <LiveResult condition={condition} keys={keys} context={context} />
                </span>
              </p>
            </AnimatedItem>
          );
        })}
      </AnimatePresence>
      {conditions.length === 0 && <p className="m-0 text-sm text-muted">{t('monitorForm.rules.empty')}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={add} disabled={fields.length === 0} aria-describedby={fields.length === 0 ? 'rules-add-reason' : undefined}>
          <IconPlus />
          {t('monitorForm.rules.add')}
        </Button>
        {fields.length === 0 && addDisabledReason && (
          <span id="rules-add-reason" className="text-sm text-muted">
            {addDisabledReason}
          </span>
        )}
      </div>
    </div>
  );
}
