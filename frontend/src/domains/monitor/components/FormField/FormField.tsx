import { useId, type ReactNode } from 'react';

/** Label above a control; the render prop receives the id that links them. */
export function FormField({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-[0.3rem]">
      <label htmlFor={id} className="text-[0.8rem] text-muted">
        {label}
      </label>
      {children(id)}
    </div>
  );
}
