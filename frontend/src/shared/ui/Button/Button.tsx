import type { ButtonHTMLAttributes, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnimationLevel } from '@/shared/motion/animationLevel';

/** `neutral` is the former name of `secondary`, kept for existing screens. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'neutral';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** One `primary` per view; `danger` only for destructive actions. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, sets aria-busy and blocks clicks while keeping the label for width. */
  loading?: boolean;
  /** Square button for a single icon; pass `aria-label`. */
  iconOnly?: boolean;
  block?: boolean;
  /** React 19 passes refs as props. */
  ref?: Ref<HTMLButtonElement>;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-accent text-on-accent hover:bg-accent/88',
  secondary: 'border-line-2 bg-s2 text-text hover:bg-s3',
  neutral: 'border-line-2 bg-s2 text-text hover:bg-s3',
  ghost: 'border-transparent bg-transparent text-muted hover:bg-s2 hover:text-text',
  danger: 'border-transparent bg-down text-bg hover:bg-down/88',
};

/** 32 px (sm) / 36 px (md); 44 px on coarse pointers. */
const SIZE_CLASS: Record<ButtonSize, { text: string; icon: string }> = {
  sm: { text: 'h-8 px-3 text-sm pointer-coarse:h-11', icon: 'size-8 pointer-coarse:size-11' },
  md: { text: 'h-9 px-3.5 text-base pointer-coarse:h-11', icon: 'size-9 pointer-coarse:size-11' },
};

/** Hover, press and focus use the 120 ms instant token; press scales to .98 (not in minimal). */
export function interactionClass(level: string): string {
  if (level === 'off') return 'transition-none';
  const base = 'transition-[color,background-color,border-color,transform] duration-120 ease-out';
  return level === 'minimal' ? base : `${base} active:scale-98`;
}

export function buttonClass({
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  block = false,
  level = 'standard',
}: Pick<ButtonProps, 'variant' | 'size' | 'iconOnly' | 'block'> & { level?: string } = {}): string {
  return [
    'relative inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border font-medium whitespace-nowrap select-none',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress',
    iconOnly ? `${SIZE_CLASS[size].icon} p-0` : SIZE_CLASS[size].text,
    interactionClass(level),
    VARIANT_CLASS[variant],
    block ? 'w-full' : '',
  ].join(' ');
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  iconOnly = false,
  block = false,
  type = 'button',
  className = '',
  disabled,
  onClick,
  children,
  ...rest
}: ButtonProps) {
  const level = useAnimationLevel();
  const { t } = useTranslation();
  return (
    <button
      type={type}
      data-variant={variant}
      data-size={size}
      data-motion="press"
      data-motion-level={level}
      aria-busy={loading || undefined}
      disabled={disabled}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      className={`${buttonClass({ variant, size, iconOnly, block, level })} ${className}`}
      {...rest}
    >
      {loading && (
        <span aria-hidden className="absolute inset-0 grid place-items-center">
          <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        </span>
      )}
      {loading ? (
        <>
          <span className="invisible inline-flex items-center gap-2">{children}</span>
          <span className="sr-only">{t('ui.loading')}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
