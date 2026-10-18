import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { INPUT_CLASS, LABEL_CLASS } from '../formStyles';

export interface SecretInputProps {
  label: string;
  /** A secret already exists in the vault; the API never sends it back. */
  stored?: boolean;
  onChange: (value: string) => void;
}

/**
 * Secret field (docs/04-data-protection.md §5): `type=password`, `autocomplete=off`, no "show" toggle,
 * uncontrolled so the typed value is never written back into a DOM attribute.
 */
export function SecretInput({ label, stored = false, onChange }: SecretInputProps) {
  const { t } = useTranslation();
  const id = useId();
  const hintId = useId();
  return (
    <div className={LABEL_CLASS}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="password"
        autoComplete="off"
        spellCheck={false}
        aria-describedby={stored ? hintId : undefined}
        className={INPUT_CLASS}
        onChange={(e) => onChange(e.target.value)}
      />
      {stored && (
        <span id={hintId} className="font-mono text-[0.75rem] text-dim">
          {t('privacy.vault')}
        </span>
      )}
    </div>
  );
}
