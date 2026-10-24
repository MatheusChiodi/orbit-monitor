import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import { nextRovingIndex } from '../popover/roving';

export interface SegmentedOption<V extends string> {
  value: V;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<V extends string> {
  /** Accessible name of the group. */
  label: string;
  options: readonly SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/** One choice among 2–5 short options, applied immediately (radiogroup with arrow keys). */
export function SegmentedControl<V extends string>({ label, options, value, onChange, size = 'md', className = '' }: SegmentedControlProps<V>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const level = useAnimationLevel();
  const current = Math.max(0, options.findIndex((o) => o.value === value));
  const onKeyDown = (event: KeyboardEvent) => {
    const next = nextRovingIndex(event, current, options.map((o) => Boolean(o.disabled)), 'both');
    if (next === null) return;
    event.preventDefault();
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };
  const height = size === 'sm' ? 'h-7 text-sm' : 'h-8 text-base';
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-sm border border-line bg-s1 p-0.5 ${className}`}
    >
      {options.map((option, i) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={i === current ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={`${height} shrink-0 rounded-sm px-3 font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40 ${
              checked ? 'bg-s3 text-text' : 'text-muted hover:text-text'
            } ${level === 'off' ? '' : 'transition-colors duration-120'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
