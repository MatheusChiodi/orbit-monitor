import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../IconButton/IconButton';
import { IconClose } from '../icons';
import { DOT_CLASS } from '../tones';
import { dismissToast, getToasts, showToast, subscribeToasts } from './toastStore';

export { dismissAllToasts, dismissToast, showToast, type ToastOptions } from './toastStore';

/** `toast({ title })` from a component; mount `<ToastViewport />` once per app (console shell). */
export function useToast() {
  return { toast: showToast, dismiss: dismissToast };
}

/**
 * Bottom-center stack. Sits above `--sticky-bar-height` (published by StickyActionBar), so a toast never
 * covers a form's Save button.
 */
export function ToastViewport() {
  const { t } = useTranslation();
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  return (
    <section
      aria-label={t('ui.notifications')}
      style={{ bottom: 'calc(var(--sticky-bar-height, 0px) + 1rem)' }}
      className="pointer-events-none fixed inset-x-0 z-60 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => {
        const tone = toast.tone ?? 'neutral';
        return (
          <div
            key={toast.id}
            role={tone === 'DOWN' ? 'alert' : 'status'}
            data-tone={tone}
            className="ui-toast pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-md border border-line-2 bg-s2 py-2.5 pr-2 pl-3.5 shadow-popover"
          >
            {tone !== 'neutral' && <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT_CLASS[tone]}`} />}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
              <p className="m-0 text-base font-medium text-text">{toast.title}</p>
              {toast.description && <p className="m-0 text-sm text-muted">{toast.description}</p>}
            </div>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.onClick();
                  dismissToast(toast.id);
                }}
                className="h-8 shrink-0 rounded-sm px-2 text-base font-medium text-accent hover:bg-s3"
              >
                {toast.action.label}
              </button>
            )}
            <IconButton label={t('ui.dismiss')} icon={IconClose} size="sm" onClick={() => dismissToast(toast.id)} />
          </div>
        );
      })}
    </section>
  );
}
