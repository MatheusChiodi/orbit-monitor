import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'danger' | 'neutral' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-info text-bg hover:bg-info/90',
  danger: 'bg-down text-white hover:bg-down/90',
  neutral: 'bg-s3 text-text border border-line-2 hover:bg-s2',
  ghost: 'bg-transparent text-muted hover:text-text hover:bg-s2',
};

export function Button({ variant = 'neutral', block = false, type = 'button', className = '', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      data-variant={variant}
      className={[
        'inline-flex h-[2.2rem] items-center justify-center gap-2 rounded-[0.45rem] px-[0.9rem]',
        'text-[0.85rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASS[variant],
        block ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}
