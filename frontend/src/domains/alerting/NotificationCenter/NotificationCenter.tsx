import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { Status } from '@/shared/api/types';
import { formatRelative } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { safeText } from '@/shared/privacy/redact';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Button, StatusDot, TEXT_CLASS } from '@/shared/ui';

export interface AppNotification {
  id: string;
  severity: Status;
  title: string;
  detail: string;
  at: string;
  read: boolean;
}

export interface NotificationCenterProps {
  notifications: readonly AppNotification[];
  now: Date;
  onRead: (id: string) => void;
  onReadAll: () => void;
}

/** FE-38: bell with the unread count in text and an in-app incident feed (newest first). */
export function NotificationCenter({ notifications, now, onRead, onReadAll }: NotificationCenterProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const dialog = useMotionPreset('dialog');
  const feedId = useId();
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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative inline-flex">
      <Button
        ref={bell}
        variant="ghost"
        aria-expanded={open}
        aria-controls={feedId}
        onClick={() => setOpen((o) => !o)}
      >
        {unread > 0 ? t('notifications.bellUnread', { count: unread }) : t('notifications.bell')}
      </Button>
      {open && (
        <motion.div
          id={feedId}
          initial={dialog.initial}
          animate={dialog.animate}
          transition={dialog.transition}
          className="absolute top-full right-0 z-40 mt-[0.4rem] w-[min(24rem,90vw)] rounded-[0.9rem] border border-line-2 bg-s1 p-[0.8rem] shadow-2xl"
        >
          {sorted.length === 0 ? (
            <p className="m-0 text-[0.85rem] text-muted">{t('notifications.empty')}</p>
          ) : (
            <>
              <ul aria-label={t('notifications.feed')} className="m-0 flex list-none flex-col gap-[0.4rem] p-0">
                {sorted.map((n) => (
                  <li key={n.id} className={`flex items-start gap-[0.5rem] rounded-[0.45rem] p-[0.4rem] ${n.read ? '' : 'bg-s2'}`}>
                    <StatusDot status={n.severity} className="mt-[0.35rem]" />
                    <span className="min-w-0 flex-1">
                      <span className={`mr-[0.4rem] text-[0.68rem] font-semibold ${TEXT_CLASS[n.severity]}`}>{t(`status.label.${n.severity}`)}</span>
                      <SafeValue value={n.title} className="text-[0.85rem] font-semibold" />
                      {n.detail && <SafeValue value={n.detail} className="block font-mono text-[0.72rem] text-muted" />}
                      <span className="block text-[0.7rem] text-dim">{formatRelative(n.at, now, locale)}</span>
                    </span>
                    {!n.read && (
                      <Button variant="ghost" aria-label={t('notifications.markRead', { title: safeText(n.title) })} onClick={() => onRead(n.id)}>
                        ✓
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {unread > 0 && (
                <div className="mt-[0.6rem] text-right">
                  <Button variant="ghost" onClick={onReadAll}>
                    {t('notifications.markAll')}
                  </Button>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
