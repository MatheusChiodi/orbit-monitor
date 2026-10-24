import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

/** Checkbox with its label to the right; the whole row is the click target. */
export function Checkbox({ label, description, id, className = '', ...rest }: CheckboxProps) {
  const generated = useId();
  const inputId = id ?? `checkbox${generated}`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <input
        type="checkbox"
        id={inputId}
        aria-describedby={descriptionId}
        {...rest}
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-sm accent-accent disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:size-5"
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={inputId} className="cursor-pointer text-base text-text">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="m-0 text-sm text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
