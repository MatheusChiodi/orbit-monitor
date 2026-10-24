import type { ReactNode } from 'react';
import type { IconComponent } from '../icons';

export interface EmptyStateProps {
  icon?: IconComponent;
  title: ReactNode;
  /** One sentence: what will show up here and how to start. */
  children?: ReactNode;
  /** One action, usually a primary Button. */
  action?: ReactNode;
  /** Heading level for the title (2 inside a page, 3 inside a panel). */
  headingLevel?: 2 | 3;
  className?: string;
}

/** Empty screens invite one action. */
export function EmptyState({ icon: Icon, title, children, action, headingLevel = 2, className = '' }: EmptyStateProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className={`flex flex-col items-center gap-3 rounded-md border border-dashed border-line-2 px-6 py-10 text-center ${className}`}>
      {Icon && (
        <span className="grid size-10 place-items-center rounded-full bg-s2 text-muted">
          <Icon size={20} />
        </span>
      )}
      <Heading className="m-0 text-md font-semibold text-text">{title}</Heading>
      {children && <p className="m-0 max-w-md text-base text-muted">{children}</p>}
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
