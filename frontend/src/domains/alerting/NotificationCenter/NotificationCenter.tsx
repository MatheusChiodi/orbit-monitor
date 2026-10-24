import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Status } from '@/shared/api/types';
import { formatRelative } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { safeText } from '@/shared/privacy/redact';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Button, IconBell, IconButton, IconCheck, StatusBadge } from '@/shared/ui';

export interface AppNotification {
  id: string;
  severity: Status;
  title: string;
  detail: string;
  at: string;
  read: boolean;
  /** Where the notification leads (e.g. `#/incidents/inc-1`). */
  href?: string;
}

export interface NotificationCenterProps {
  notifications: readonly AppNotification[];
  now: Date;
  onRead: (id: string) => void;
  onReadAll: () => void;
}

/**
 * FE-38 / FE-63: bell icon with the unread count (named in text for screen readers) and a popover feed,
 * newest first. Esc or a click outside closes it.
 */
export function NotificationCenter({ notifications, now, onRead, onReadAll }: NotificationCenterProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const feedId = useId();
  const root = useRef<HTMLDivElement>(null);
  const bell = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  const sorted = [...notifications].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      bell.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div ref={root} className="relative inline-flex">
      <Button
        ref={bell}
        variant="ghost"
        iconOnly
        aria-label={unread > 0 ? t('notifications.bellUnread', { count: unread }) : t('notifications.bell')}
        title={t('notifications.bell')}
        aria-expanded={open}
        aria-controls={feedId}
        onClick={() => setOpen((o) => !o)}
      >
        <IconBell size={20} />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-down px-1 font-mono text-xs leading-none font-semibold text-bg"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>
      {open && (
        <div
          id={feedId}
          className="ui-pop absolute top-full right-0 z-40 mt-2 flex max-h-96 w-80 flex-col rounded-lg border border-line-2 bg-s1 shadow-popover sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line py-2 pr-2 pl-4">
            <h2 className="m-0 text-base font-semibold text-text">{t('notifications.bell')}</h2>
            {unread > 0 && (
              <Button variant="ghost" size="sm" onClick={onReadAll}>
                {t('notifications.markAll')}
              </Button>
            )}
          </div>
          {sorted.length === 0 ? (
            <p className="m-0 px-4 py-6 text-center text-base text-muted">{t('notifications.empty')}</p>
          ) : (
            <ul aria-label={t('notifications.feed')} className="m-0 flex min-h-0 list-none flex-col overflow-y-auto p-1">
              {sorted.map((n) => (
                <li key={n.id} className={`flex items-start gap-3 rounded-md py-2 pr-1 pl-3 ${n.read ? '' : 'bg-s2'}`}>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <StatusBadge status={n.severity} size="sm" />
                      <span className="text-xs text-dim">{formatRelative(n.at, now, locale)}</span>
                    </span>
                    {n.href ? (
                      <a
                        href={n.href}
                        className="text-base font-medium text-text hover:underline"
                        onClick={() => {
                          if (!n.read) onRead(n.id);
                          setOpen(false);
                        }}
                      >
                        <SafeValue value={n.title} />
                      </a>
                    ) : (
                      <SafeValue value={n.title} className="text-base font-medium text-text" />
                    )}
                    {n.detail && <SafeValue value={n.detail} className="block font-mono text-xs text-muted" />}
                  </span>
                  {!n.read && (
                    <IconButton
                      size="sm"
                      icon={IconCheck}
                      label={t('notifications.markRead', { title: safeText(n.title) })}
                      onClick={() => onRead(n.id)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
