import type { ReactNode, Ref, SelectHTMLAttributes } from 'react';
import { useFieldControlProps } from '../Field/Field';
import { SELECT_CLASS } from '../formStyles';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  ref?: Ref<HTMLSelectElement>;
  /** First, disabled option with value "" (e.g. "Choose a group"); pass value/defaultValue "" to show it. */
  placeholder?: string;
  children: ReactNode;
}

/** Native select, styled; keyboard and mobile pickers come from the platform. */
export function Select({ placeholder, className = '', children, ...rest }: SelectProps) {
  const field = useFieldControlProps(rest);
  return (
    <select {...rest} {...field} className={`${SELECT_CLASS} ${className}`}>
      {placeholder !== undefined && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
}
