import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../IconButton/IconButton';
import { IconClose } from '../icons';
import { focusableIn, trapTab } from '../popover/focus';

export interface DialogProps {
  open: boolean;
  /** Esc, the close button and a backdrop click call it; the caller sets `open` to false. */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Actions, right-aligned: secondary first, one primary last. */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Element to focus on open; defaults to the first focusable field in the body. */
  initialFocus?: React.RefObject<HTMLElement | null>;
  children?: ReactNode;
}

const WIDTH = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' } as const;

/** Modal dialog: labelled, focus trapped, Esc closes, focus returns to what opened it. */
export function Dialog({ open, onClose, title, description, footer, size = 'md', initialFocus, children }: DialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = initialFocus?.current ?? (body.current && focusableIn(body.current)[0]) ?? panel.current;
    target?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
      } else if (panel.current) trapTab(event, panel.current);
    };
    document.addEventListener('keydown', onKey, true);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open, initialFocus]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div aria-hidden className="ui-backdrop absolute inset-0 bg-bg/70" onClick={() => onClose()} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`ui-dialog relative flex max-h-full w-full ${WIDTH[size]} flex-col rounded-lg border border-line-2 bg-s1 shadow-popover focus:outline-none`}
      >
        <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={titleId} className="m-0 text-lg font-semibold text-text">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="m-0 text-base text-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton label={t('ui.close')} icon={IconClose} size="sm" onClick={() => onClose()} className="-mt-1 -mr-2" />
        </header>
        <div ref={body} className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {children}
        </div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
