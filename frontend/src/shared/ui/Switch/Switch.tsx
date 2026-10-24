import { useId, type ReactNode } from 'react';
import { useAnimationLevel } from '@/shared/motion/animationLevel';

export interface SwitchProps {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** On/off setting that applies immediately (use Checkbox inside forms that are saved). */
export function Switch({ label, description, checked, onCheckedChange, disabled = false, id, className = '' }: SwitchProps) {
  const generated = useId();
  const switchId = id ?? `switch${generated}`;
  const descriptionId = description ? `${switchId}-description` : undefined;
  const level = useAnimationLevel();
  const motion = level === 'off' ? 'transition-none' : 'transition-[transform,background-color] duration-150 ease-out';
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={switchId} className="cursor-pointer text-base text-text">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="m-0 text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-line-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-accent' : 'bg-s3'} ${motion}`}
      >
        <span
          aria-hidden
          className={`ml-0.5 size-3.5 rounded-full ${checked ? 'translate-x-4 bg-on-accent' : 'translate-x-0 bg-muted'} ${motion}`}
        />
      </button>
    </div>
  );
}
