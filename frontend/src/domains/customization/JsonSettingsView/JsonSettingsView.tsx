import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sanitizeSettings } from '@/shared/customization/registry';
import type { Scope, SettingValues } from '@/shared/customization/types';
import { Button } from '@/shared/ui';

export interface JsonSettingsViewProps {
  scope: Scope;
  scopeLabel: string;
  values: SettingValues;
  disabled?: boolean;
  onApply: (values: SettingValues) => void | Promise<void>;
}

type Feedback = { kind: 'error'; text: string } | { kind: 'ok'; text: string } | null;

/** Power-user view of one scope, validated by the same registry schema (docs/07 §2). */
export function JsonSettingsView({ scope, scopeLabel, values, disabled = false, onApply }: JsonSettingsViewProps) {
  const { t } = useTranslation();
  const id = useId();
  const [text, setText] = useState(() => JSON.stringify(values, null, 2));
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function apply() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setFeedback({ kind: 'error', text: t('customization.editor.jsonInvalid') });
      return;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setFeedback({ kind: 'error', text: t('customization.editor.jsonInvalid') });
      return;
    }
    const clean = sanitizeSettings(parsed, scope);
    const dropped = Object.keys(parsed).length - Object.keys(clean).length;
    await onApply(clean);
    setText(JSON.stringify(clean, null, 2));
    setFeedback({ kind: 'ok', text: dropped > 0 ? t('customization.editor.jsonDropped', { count: dropped }) : t('customization.editor.jsonApplied') });
  }

  return (
    <div className="flex flex-col gap-[0.6rem]">
      <label htmlFor={id} className="text-[0.8rem] text-muted">
        {t('customization.editor.jsonLabel', { scope: scopeLabel })}
      </label>
      <textarea
        id={id}
        spellCheck={false}
        rows={14}
        className="w-full rounded-[0.45rem] border border-line-2 bg-s2 p-[0.6rem] font-mono text-[0.8rem] text-text focus:border-info focus:outline-none"
        value={text}
        readOnly={disabled}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-[0.8rem]">
        {!disabled && (
          <Button variant="primary" onClick={() => void apply()}>
            {t('customization.editor.applyJson')}
          </Button>
        )}
        {feedback && (
          <span role={feedback.kind === 'error' ? 'alert' : 'status'} className={`text-[0.82rem] ${feedback.kind === 'error' ? 'text-down-text' : 'text-ok-text'}`}>
            {feedback.text}
          </span>
        )}
      </div>
    </div>
  );
}
