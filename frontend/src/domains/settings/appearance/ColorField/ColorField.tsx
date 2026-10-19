import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { isHexColor } from '@/shared/theme';

export interface ColorFieldProps {
  /** Token name; also the accessible label (`bg`, `chart 1`, `syntax keyword`). */
  label: string;
  value: string;
  /** Called on every keystroke with the raw text; the parent decides whether it is a color yet. */
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Hex text field + native picker. Alpha (`#rrggbbaa`) is kept from the text field only. */
export function ColorField({ label, value, onChange, disabled = false }: ColorFieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const valid = isHexColor(value);
  const swatch = valid ? value.slice(0, 7) : '#000000';
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={t('theme.editor.pick', { token: label })}
        value={swatch.length === 4 ? `#${[...swatch.slice(1)].map((c) => c + c).join('')}` : swatch}
        disabled={disabled}
        onInput={(e) => onChange(e.currentTarget.value)}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="size-[2rem] shrink-0 cursor-pointer rounded-[0.4rem] border border-line-2 bg-transparent p-0 disabled:cursor-not-allowed"
      />
      <label htmlFor={id} className="w-[7.5rem] shrink-0 font-mono text-[0.78rem] text-muted">
        {label}
      </label>
      <input
        id={id}
        type="text"
        spellCheck={false}
        autoComplete="off"
        maxLength={9}
        value={value}
        disabled={disabled}
        aria-invalid={valid ? undefined : true}
        onChange={(e) => onChange(e.currentTarget.value.trim())}
        className="h-[2rem] w-[6.5rem] min-w-0 rounded-[0.4rem] border border-line-2 bg-s2 px-2 font-mono text-[0.8rem] text-text focus:border-info focus:outline-none aria-[invalid=true]:border-down disabled:opacity-40"
      />
    </div>
  );
}
