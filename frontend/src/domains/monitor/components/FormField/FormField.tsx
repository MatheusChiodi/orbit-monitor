import { useId, type ReactNode } from 'react';

/** Label above a control; the render prop receives the id that links them. */
export function FormField({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      {children(id)}
    </div>
  );
}
