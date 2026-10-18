import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, INPUT_CLASS } from '@/shared/ui';
import { normalizeOperatorName } from '../operator';

export interface OperatorPromptProps {
  initialName?: string;
  onSubmit: (name: string) => void;
}

/** Asks for the self-declared operator name (sent as `X-Orbit-Operator`). Not a login. */
export function OperatorPrompt({ initialName = '', onSubmit }: OperatorPromptProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const hintId = useId();
  const [value, setValue] = useState(initialName);
  const [error, setError] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const name = normalizeOperatorName(value);
    if (!name) {
      setError(true);
      return;
    }
    onSubmit(name);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex w-full max-w-[24rem] flex-col gap-[0.9rem] rounded-[0.9rem] border border-line bg-s1 p-[1.4rem]"
    >
      <h1 className="m-0 font-display text-[1.4rem] font-bold tracking-tight">{t('operator.title')}</h1>
      <label htmlFor={inputId} className="text-[0.85rem] text-muted">
        {t('operator.label')}
      </label>
      <input
        id={inputId}
        className={INPUT_CLASS}
        autoComplete="nickname"
        aria-describedby={hintId}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(false);
        }}
      />
      <p id={hintId} className="m-0 text-[0.78rem] text-dim">
        {t('operator.hint')}
      </p>
      {error && (
        <p role="alert" className="m-0 text-[0.85rem] text-down-text">
          {t('operator.required')}
        </p>
      )}
      <Button type="submit" variant="primary" block>
        {t('operator.submit')}
      </Button>
    </form>
  );
}
