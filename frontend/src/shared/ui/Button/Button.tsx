import type { ButtonHTMLAttributes, Ref } from 'react';
import { useAnimationLevel } from '@/shared/motion/animationLevel';

export type ButtonVariant = 'primary' | 'danger' | 'neutral' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
  /** React 19 passes refs as props. */
  ref?: Ref<HTMLButtonElement>;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-info text-bg hover:bg-info/90',
  danger: 'bg-down text-white hover:bg-down/90',
  neutral: 'bg-s3 text-text border border-line-2 hover:bg-s2',
  ghost: 'bg-transparent text-muted hover:text-text hover:bg-s2',
};

/** Hover, press and focus use the 120 ms instant token; press scales to .98 (not in minimal). */
function interactionClass(level: string): string {
  if (level === 'off') return 'transition-none';
  const base = 'transition-[color,background-color,border-color,transform] duration-[120ms]';
  return level === 'minimal' ? base : `${base} active:scale-[.98]`;
}

export function Button({ variant = 'neutral', block = false, type = 'button', className = '', ...rest }: ButtonProps) {
  const level = useAnimationLevel();
  return (
    <button
      type={type}
      data-variant={variant}
      data-motion="press"
      data-motion-level={level}
      className={[
        'inline-flex h-[2.2rem] items-center justify-center gap-2 rounded-[0.45rem] px-[0.9rem]',
        'text-[0.85rem] font-semibold disabled:cursor-not-allowed disabled:opacity-50',
        interactionClass(level),
        VARIANT_CLASS[variant],
        block ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}
