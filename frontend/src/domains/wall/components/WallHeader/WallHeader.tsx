import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { globalPhrase, statusFromCounts, tabTitle, type StatusCounts } from '@/domains/monitor/status';
import { formatClock, formatRelative } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { translate } from '@/shared/i18n/message';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import { Button, FlashValue, StatusPill } from '@/shared/ui';
import type { WallConnectionState } from '../../store';
import { StaleBadge } from '../StaleBadge';

export interface WallHeaderProps {
  environment: string;
  counts: StatusCounts;
  now: Date;
  updatedAt: string | null;
  connection: WallConnectionState;
  onFullscreen?: () => void;
  /** FE-46: no update for too long. */
  stale?: boolean;
}

const CONNECTION_NOTE = {
  mock: 'wall.connection.mock',
  closed: 'wall.connection.closed',
  connecting: 'wall.connection.connecting',
} as const;

/** Provisional mark: blue→green gradient ring with a dark core (docs/03-design.md, section 8). */
function BrandMark() {
  return (
    <span
      aria-hidden
      className="inline-block size-[1.3rem] rounded-full p-[0.22rem]"
      style={{ background: 'conic-gradient(from 200deg, var(--info), var(--ok), var(--info))' }}
    >
      <span className="block size-full rounded-full bg-bg" />
    </span>
  );
}

export function WallHeader({ environment, counts, now, updatedAt, connection, onFullscreen, stale = false }: WallHeaderProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const title = tabTitle(counts);
  useEffect(() => {
    document.title = title;
  }, [title]);

  const level = useAnimationLevel();
  const note = connection === 'open' ? null : t(CONNECTION_NOTE[connection]);

  return (
    <header data-motion-level={level} className="flex min-h-[3.2rem] flex-wrap items-center gap-x-[1.2rem] gap-y-[0.4rem] border-b border-line px-[1rem] py-[0.4rem]">
      <div className="flex items-center gap-[0.55rem]">
        <BrandMark />
        <span className="font-display text-[1.1rem] font-bold tracking-tight">{t('app.name')}</span>
        <span className="rounded-[0.4rem] border border-line-2 px-[0.45rem] py-[0.05rem] text-[0.78rem] text-muted">
          {environment}
        </span>
      </div>

      <div role="status" aria-live="polite">
        <StatusPill status={statusFromCounts(counts)}>{translate(t, globalPhrase(counts))}</StatusPill>
      </div>

      <ul className="m-0 flex list-none gap-[0.9rem] p-0 font-mono text-[0.85rem]" aria-label={t('status.counts')}>
        <li>
          <FlashValue value={counts.down} className={counts.down ? 'text-down-text' : 'text-dim'}>{t('status.counter.down', { count: counts.down })}</FlashValue>
        </li>
        <li>
          <FlashValue value={counts.warn} className={counts.warn ? 'text-warn-text' : 'text-dim'}>{t('status.counter.warn', { count: counts.warn })}</FlashValue>
        </li>
        <li>
          <FlashValue value={counts.ok} className={counts.ok ? 'text-ok-text' : 'text-dim'}>{t('status.counter.ok', { count: counts.ok })}</FlashValue>
        </li>
      </ul>

      <div className="ml-auto flex items-center gap-[0.9rem]">
        {note && <span className="text-[0.78rem] text-warn-text">{note}</span>}
        {updatedAt && stale && <StaleBadge updatedAt={updatedAt} now={now} />}
        {updatedAt && !stale && (
          <span className="text-[0.78rem] text-muted">
            {t('wall.updated', { when: formatRelative(updatedAt, now, locale) })}
          </span>
        )}
        <time dateTime={now.toISOString()} className="font-mono text-[1.15rem] font-medium">
          {formatClock(now)}
        </time>
        {onFullscreen && (
          <Button variant="ghost" onClick={onFullscreen} aria-label={t('wall.fullscreen')}>
            ⛶
          </Button>
        )}
      </div>
    </header>
  );
}
