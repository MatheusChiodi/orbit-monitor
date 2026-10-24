import { useId, type HTMLAttributes, type ReactNode } from 'react';
import { PANEL_CLASS } from '../Panel/Panel';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** With a title the card is a labelled region (section); without, a plain div. */
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

/** Static surface for grouping content (no enter motion, no glass); Panel stays for live wall-style blocks. */
export function Card({ title, description, actions, className = '', children, ...rest }: CardProps) {
  const titleId = useId();
  const Element = title ? 'section' : 'div';
  return (
    <Element data-surface="panel" aria-labelledby={title ? titleId : undefined} className={`${PANEL_CLASS} gap-3 ${className}`} {...rest}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title && (
              <h2 id={titleId} className="m-0 text-md font-semibold text-text">
                {title}
              </h2>
            )}
            {description && <p className="m-0 text-sm text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </Element>
  );
}
