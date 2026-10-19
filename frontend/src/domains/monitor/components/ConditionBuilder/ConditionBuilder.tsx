import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Condition } from '@/shared/api/types';
import { INPUT_CLASS } from '@/shared/ui';
import { evaluateCondition, validateCondition, type EvaluationContext } from '../../conditions';
import { conditionsToText, parseConditionsText, type ConditionTextError } from '../../conditions/conditionText';
import { ConditionEditor } from '../ConditionEditor';

export interface ConditionBuilderProps {
  conditions: readonly Condition[];
  fields: readonly string[];
  context: EvaluationContext | null;
  onChange: (conditions: Condition[]) => void;
}

type Mode = 'visual' | 'text';
const MODES: Mode[] = ['visual', 'text'];

/** FE-34: visual rows and a text mode kept in sync; both say which conditions would fail now. */
export function ConditionBuilder({ conditions, fields, context, onChange }: ConditionBuilderProps) {
  const { t } = useTranslation();
  const baseId = useId();
  const tabs = useRef<Record<Mode, HTMLButtonElement | null>>({ visual: null, text: null });
  const [mode, setMode] = useState<Mode>('visual');
  const [draft, setDraft] = useState(() => conditionsToText(conditions));
  const [errors, setErrors] = useState<ConditionTextError[]>([]);

  function select(next: Mode) {
    if (next === 'text') {
      setDraft(conditionsToText(conditions));
      setErrors([]);
    }
    setMode(next);
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = MODES.indexOf(mode);
    const next = MODES[(index + (event.key === 'ArrowRight' ? 1 : MODES.length - 1)) % MODES.length]!;
    select(next);
    tabs.current[next]?.focus();
  }

  function onText(text: string) {
    setDraft(text);
    const parsed = parseConditionsText(text);
    setErrors(parsed.errors);
    // Invalid text keeps the last valid conditions.
    if (parsed.errors.length === 0) onChange(parsed.conditions);
  }

  const failing = context
    ? conditions.filter((c) => !validateCondition(c, fields) && evaluateCondition(c, context) === 'fail').length
    : 0;

  return (
    <div className="flex flex-col gap-[0.6rem]">
      <div role="tablist" aria-label={t('conditions.modesLabel')} className="flex gap-[0.3rem]">
        {MODES.map((m) => (
          <button
            key={m}
            ref={(el) => {
              tabs.current[m] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-${m}-tab`}
            aria-selected={mode === m}
            aria-controls={`${baseId}-${m}-panel`}
            tabIndex={mode === m ? 0 : -1}
            onClick={() => select(m)}
            onKeyDown={onTabKey}
            className={`h-[2rem] rounded-[0.45rem] border px-[0.8rem] text-[0.82rem] font-semibold ${mode === m ? 'border-info bg-info/12 text-info' : 'border-line-2 text-muted'}`}
          >
            {t(`conditions.modes.${m}`)}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${baseId}-${mode}-panel`} aria-labelledby={`${baseId}-${mode}-tab`}>
        {mode === 'visual' ? (
          <ConditionEditor conditions={conditions} fields={fields} context={context} onChange={onChange} />
        ) : (
          <div className="flex flex-col gap-[0.4rem]">
            <textarea
              aria-label={t('conditions.textLabel')}
              spellCheck={false}
              value={draft}
              onChange={(e) => onText(e.target.value)}
              className={`${INPUT_CLASS} h-auto min-h-[6rem] py-[0.5rem] font-mono`}
            />
            {errors.length > 0 && (
              <ul role="alert" className="m-0 list-none p-0 text-[0.8rem] text-down-text">
                {errors.map((e) => (
                  <li key={e.line}>{t('conditions.lineError', { line: e.line, error: t(e.key) })}</li>
                ))}
              </ul>
            )}
            {context && failing > 0 && (
              <p className="m-0 text-[0.8rem] text-warn-text">{t('conditions.failingCount', { count: failing })}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
