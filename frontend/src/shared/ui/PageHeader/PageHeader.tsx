import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned actions; at most one primary. */
  actions?: ReactNode;
  /** Small line above the title (back link, breadcrumb). */
  eyebrow?: ReactNode;
  className?: string;
}

/** The page h1 in the display face, with its description and actions. */
export function PageHeader({ title, description, actions, eyebrow, className = '' }: PageHeaderProps) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-6 ${className}`}>
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <div className="text-sm text-muted">{eyebrow}</div>}
        <h1 className="display-wide m-0 text-xl text-text">{title}</h1>
        {description && <p className="m-0 max-w-2xl text-base text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
