import type { Ref, TextareaHTMLAttributes } from 'react';
import { useFieldControlProps } from '../Field/Field';

const TEXTAREA_CLASS =
  'min-h-20 w-full min-w-0 rounded-sm border border-line-2 bg-s2 px-2.5 py-2 text-base leading-normal text-text placeholder:text-dim focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-down';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
  /** Monospace for code (SQL, JSON). */
  mono?: boolean;
}

export function TextArea({ mono = false, className = '', ...rest }: TextAreaProps) {
  const field = useFieldControlProps(rest);
  return <textarea {...rest} {...field} className={`${TEXTAREA_CLASS} ${mono ? 'font-mono text-sm' : ''} ${className}`} />;
}
