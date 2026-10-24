import type { Ref, TextareaHTMLAttributes } from 'react';
import { useFieldControlProps } from '../Field/Field';
import { TEXTAREA_CLASS } from '../formStyles';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement>;
  /** Monospace for code (SQL, JSON). */
  mono?: boolean;
}

export function TextArea({ mono = false, className = '', ...rest }: TextAreaProps) {
  const field = useFieldControlProps(rest);
  return <textarea {...rest} {...field} className={`${TEXTAREA_CLASS} ${mono ? 'font-mono text-sm' : ''} ${className}`} />;
}
