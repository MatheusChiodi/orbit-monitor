import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Condition } from '@/shared/api/types';
import { Button, TextArea } from '@/shared/ui';
import { evaluateCondition, validateCondition, type EvaluationContext } from '../../conditions';
import { conditionsToText, parseConditionsText, type ConditionTextError } from '../../conditions/conditionText';
import { ConditionEditor, type ConditionField } from '../ConditionEditor';

export interface ConditionBuilderProps {
  conditions: readonly Condition[];
  fields: readonly ConditionField[];
  context: EvaluationContext | null;
  onChange: (conditions: Condition[]) => void;
  addDisabledReason?: string;
}

/** FE-34: rules as sentences by default; "Edit as text" opens the Gatus-style text, kept in sync. */
export function ConditionBuilder({ conditions, fields, context, onChange, addDisabledReason }: ConditionBuilderProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(false);
  const [draft, setDraft] = useState(() => conditionsToText(conditions));
  const [errors, setErrors] = useState<ConditionTextError[]>([]);
  const keys = fields.map((f) => f.key);

  function toggle() {
    if (!text) {
      setDraft(conditionsToText(conditions));
      setErrors([]);
    }
    setText(!text);
  }

  function onText(value: string) {
    setDraft(value);
    const parsed = parseConditionsText(value);
    setErrors(parsed.errors);
    // Invalid text keeps the last valid conditions.
    if (parsed.errors.length === 0) onChange(parsed.conditions);
  }

  const failing = context ? conditions.filter((c) => !validateCondition(c, keys) && evaluateCondition(c, context) === 'fail').length : 0;

  return (
    <div className="flex flex-col gap-3">
      {text ? (
        <div className="flex flex-col gap-2">
          <TextArea mono rows={5} aria-label={t('conditions.textLabel')} aria-describedby="rules-text-hint" spellCheck={false} value={draft} onChange={(e) => onText(e.target.value)} />
          <p id="rules-text-hint" className="m-0 text-sm text-muted">
            {t('monitorForm.rules.textHint')}
          </p>
          {errors.length > 0 && (
            <ul role="alert" className="m-0 list-none p-0 text-sm text-down-text">
              {errors.map((e) => (
                <li key={e.line}>{t('conditions.lineError', { line: e.line, error: t(e.key) })}</li>
              ))}
            </ul>
          )}
          {context && failing > 0 && <p className="m-0 text-sm text-warn-text">{t('conditions.failingCount', { count: failing })}</p>}
        </div>
      ) : (
        <ConditionEditor conditions={conditions} fields={fields} context={context} onChange={onChange} addDisabledReason={addDisabledReason} />
      )}
      <div>
        <Button variant="ghost" size="sm" aria-pressed={text} onClick={toggle}>
          {text ? t('monitorForm.rules.visualMode') : t('monitorForm.rules.textMode')}
        </Button>
      </div>
    </div>
  );
}
