import type { InputHTMLAttributes, Ref } from 'react';
import { useFieldControlProps } from '../Field/Field';
import { INPUT_CLASS } from '../formStyles';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

/** Single-line input; inside a Field it takes the label, hint and error wiring. */
export function TextInput({ type = 'text', className = '', ...rest }: TextInputProps) {
  const field = useFieldControlProps(rest);
  return <input type={type} {...rest} {...field} className={`${INPUT_CLASS} ${className}`} />;
}
