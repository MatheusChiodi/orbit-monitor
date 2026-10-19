import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import type { Condition, ConditionOperator, Severity } from '@/shared/api/types';
import { translate } from '@/shared/i18n/message';
import { AnimatedItem, Button, INPUT_CLASS, SELECT_CLASS } from '@/shared/ui';
import { evaluateCondition, validateCondition, type EvaluationContext } from '../../conditions';

export interface ConditionEditorProps {
  conditions: readonly Condition[];
  /** Fields available in the preview result. */
  fields: readonly string[];
  /** Current result for live validation; null before the preview. */
  context: EvaluationContext | null;
  onChange: (conditions: Condition[]) => void;
}

const SYMBOL_OPERATORS: ConditionOperator[] = ['<', '<=', '>', '>=', '==', '!=', 'between', 'in'];
const LEVELS: Severity[] = ['WARN', 'DOWN'];

/** The verdict text cross-fades when it changes ("would fail" ↔ "passes"). */
function Verdict({ id, children }: { id: string; children: ReactNode }) {
  const fade = useMotionPreset('status');
  return (
    <span className="inline-grid">
      <AnimatePresence initial={false}>
        <motion.span
          key={id}
          className="[grid-area:1/1]"
          initial={fade.level === 'off' ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fade.transition}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function LiveResult({
  condition,
  fields,
  context,
}: {
  condition: Condition;
  fields: readonly string[];
  context: EvaluationContext | null;
}) {
  const { t } = useTranslation();
  const error = validateCondition(condition, fields);
  if (error) return <Verdict id="error"><span className="text-down-text">{translate(t, error)}</span></Verdict>;
  if (!context) return null;
  const result = evaluateCondition(condition, context);
  if (result === 'invalid') return <Verdict id="invalid"><span className="text-muted">{t('conditions.cannotEvaluate')}</span></Verdict>;
  if (result === 'fail') {
    return (
      <Verdict id={`fail-${condition.level}`}>
        <span className={condition.level === 'DOWN' ? 'text-down-text' : 'text-warn-text'}>
          {t('conditions.wouldFail', { level: t(`status.label.${condition.level}`) })}
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

/** Conditions as `field · operator · value · level` rows, validated against the preview. */
export function ConditionEditor({ conditions, fields, context, onChange }: ConditionEditorProps) {
  const { t } = useTranslation();

  function update(index: number, patch: Partial<Condition>) {
    onChange(conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function add() {
    onChange([...conditions, { field: fields[0] ?? '', operator: '<', value: '', level: 'WARN' }]);
  }

  return (
    <div className="flex flex-col gap-[0.6rem]">
      <AnimatePresence>
      {conditions.map((condition, index) => (
        <AnimatedItem
          as="div"
          key={index}
          role="group"
          aria-label={t('conditions.group', { n: index + 1 })}
          className="flex flex-col gap-[0.3rem] rounded-[0.45rem] border border-line bg-s1 p-[0.6rem]"
        >
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_auto] items-center gap-[0.4rem]">
            <select
              aria-label={t('conditions.field')}
              className={`${SELECT_CLASS} font-mono`}
              value={condition.field}
              onChange={(e) => update(index, { field: e.target.value })}
            >
              {!fields.includes(condition.field) && <option value={condition.field}>{condition.field || '—'}</option>}
              {fields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              aria-label={t('conditions.operator')}
              className={`${SELECT_CLASS} font-mono`}
              value={condition.operator}
              onChange={(e) => update(index, { operator: e.target.value as ConditionOperator })}
            >
              {SYMBOL_OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
              <option value="older_than">{t('conditions.newerThan')}</option>
            </select>
            <input
              aria-label={t('conditions.value')}
              className={`${INPUT_CLASS} font-mono`}
              value={condition.value}
              placeholder={condition.operator === 'between' ? '10..50' : condition.operator === 'older_than' ? '10min' : '200'}
              onChange={(e) => update(index, { value: e.target.value })}
            />
            <select
              aria-label={t('conditions.level')}
              className={SELECT_CLASS}
              value={condition.level}
              onChange={(e) => update(index, { level: e.target.value as Severity })}
            >
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {t(`conditions.levels.${level}`)}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              aria-label={t('conditions.remove', { n: index + 1 })}
              onClick={() => onChange(conditions.filter((_, i) => i !== index))}
            >
              ✕
            </Button>
          </div>
          <p className="m-0 text-[0.78rem]" aria-live="polite">
            <LiveResult condition={condition} fields={fields} context={context} />
          </p>
        </AnimatedItem>
      ))}
      </AnimatePresence>
      <div>
        <Button variant="neutral" onClick={add} disabled={fields.length === 0}>
          {t('conditions.add')}
        </Button>
      </div>
    </div>
  );
}
