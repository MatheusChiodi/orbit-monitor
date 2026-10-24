import { createContext, use, useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface FieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** Ids and state of the enclosing Field; TextInput, TextArea, Select and FilePicker read it. */
export function useField(): FieldContextValue | null {
  return use(FieldContext);
}

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  /** Says what happened and how to fix it; marks the control invalid. */
  error?: ReactNode;
  required?: boolean;
  /** Use an existing id for the control instead of a generated one. */
  id?: string;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint + error, with ids wired for screen readers. */
export function Field({ label, hint, error, required = false, id, className = '', children }: FieldProps) {
  const { t } = useTranslation();
  const generated = useId();
  const controlId = id ?? `field${generated}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`} data-invalid={error ? 'true' : undefined}>
      <label htmlFor={controlId} className="flex items-baseline gap-1.5 text-sm font-medium text-text">
        {label}
        {required && <span className="text-xs font-normal text-dim">{t('ui.required')}</span>}
      </label>
      <FieldContext value={{ id: controlId, describedBy, invalid: Boolean(error), required }}>{children}</FieldContext>
      {hint && (
        <p id={hintId} className="m-0 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="m-0 text-sm text-down-text">
          {error}
        </p>
      )}
    </div>
  );
}

export interface FieldControlProps {
  id?: string;
  required?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
}

/** Props a control takes from the enclosing Field unless it sets them itself. */
export function useFieldControlProps(props: FieldControlProps): FieldControlProps {
  const field = useField();
  return {
    id: props.id ?? field?.id,
    required: props.required ?? (field?.required || undefined),
    'aria-describedby': props['aria-describedby'] ?? field?.describedBy,
    'aria-invalid': props['aria-invalid'] ?? (field?.invalid ? true : undefined),
  };
}
