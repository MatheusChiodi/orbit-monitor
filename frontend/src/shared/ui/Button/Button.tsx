import type { ButtonHTMLAttributes, Ref } from 'react';
import { useAnimationLevel } from '@/shared/motion/animationLevel';

/** `neutral` is the former name of `secondary`, kept for existing screens. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'neutral';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** One `primary` per view; `danger` only for destructive actions. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Sets aria-busy (spinner drawn by theme.css) and blocks clicks; the label stays for width and screen readers. */
  loading?: boolean;
  /** Square button for a single icon; pass `aria-label`. */
  iconOnly?: boolean;
  block?: boolean;
  /** React 19 passes refs as props. */
  ref?: Ref<HTMLButtonElement>;
}

const VARIANT_CLASS: Record<Exclude<ButtonVariant, 'neutral'>, string> = {
  primary: 'border-transparent bg-accent text-on-accent hover:bg-accent/88',
  secondary: 'border-line-2 bg-s2 text-text hover:bg-s3',
  ghost: 'border-transparent text-muted hover:bg-s2 hover:text-text',
  danger: 'border-transparent bg-down text-bg hover:bg-down/88',
};

/** 32 px (sm) / 36 px (md); `ui-control` (theme.css) raises console controls to 44 px on coarse pointers. */
const SIZE_CLASS: Record<ButtonSize, { text: string; icon: string }> = {
  sm: { text: 'h-8 px-3 text-sm', icon: 'size-8' },
  md: { text: 'h-9 px-3.5 text-base', icon: 'size-9' },
};

/** Hover, press and focus use the 120 ms instant token; press scales to .98 (not in minimal). */
export function interactionClass(level: string): string {
  if (level === 'off') return 'transition-none';
  const base = 'transition-[color,background-color,border-color,transform] duration-120';
  return level === 'minimal' ? base : `${base} active:scale-98`;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  iconOnly = false,
  block = false,
  type = 'button',
  className = '',
  onClick,
  children,
  ...rest
}: ButtonProps) {
  const level = useAnimationLevel();
  return (
    <button
      type={type}
      data-variant={variant}
      data-motion="press"
      data-motion-level={level}
      aria-busy={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      className={`ui-control relative inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border font-medium whitespace-nowrap disabled:opacity-50 ${
        SIZE_CLASS[size][iconOnly ? 'icon' : 'text']
      } ${interactionClass(level)} ${VARIANT_CLASS[variant === 'neutral' ? 'secondary' : variant]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
