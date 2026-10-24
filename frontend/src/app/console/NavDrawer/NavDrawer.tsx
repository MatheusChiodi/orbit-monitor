import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { IconButton, IconClose } from '@/shared/ui';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import { focusableIn, trapTab } from '@/shared/ui/popover/focus';

export interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * FE-63 mobile navigation: a modal panel from the left edge. Focus moves in and is trapped, Esc and the
 * backdrop close it, focus returns to the menu button.
 */
export function NavDrawer({ open, onClose, children }: NavDrawerProps) {
  const { t } = useTranslation();
  const level = useAnimationLevel();
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || !panel.current) return;
    const root = panel.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (root.querySelector<HTMLElement>('[aria-current="page"]') ?? focusableIn(root)[0] ?? root).focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
      } else trapTab(event, root);
    };
    document.addEventListener('keydown', onKey, true);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div aria-hidden className="ui-backdrop absolute inset-0 bg-bg/70" onClick={() => onClose()} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('screens.shell.navigation')}
        tabIndex={-1}
        data-animation={level}
        className={`absolute inset-y-0 left-0 flex w-72 max-w-full flex-col border-r border-line bg-s1 shadow-popover focus:outline-none ${level === 'off' ? '' : 'transition-transform duration-200 ease-out motion-reduce:transition-none starting:-translate-x-full'}`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line pr-2 pl-6">
          <span className="display-wide text-md text-text">{t('app.name')}</span>
          <IconButton label={t('ui.close')} icon={IconClose} onClick={() => onClose()} />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
