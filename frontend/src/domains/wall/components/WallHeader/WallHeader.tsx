import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { globalPhrase, statusFromCounts, tabTitle, type StatusCounts } from '@/domains/monitor/status';
import { formatClock, formatRelative } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { translate } from '@/shared/i18n/message';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import type { Group, WorkspaceBranding } from '@/shared/api/types';
import { OrbitMark, WorkspaceBrand } from '@/domains/workspace/WorkspaceBrand';
import type { OrbMonitor } from '@/shared/fx/LivingOrb/orbModel';
import { Button, FlashValue, StatusPill } from '@/shared/ui';
import type { WallConnectionState } from '../../store';
import { StaleBadge } from '../StaleBadge';

/** FE-59 header mini orb: decorative (the status pill says the same), so it loads after first paint. */
const MiniOrb = lazy(() => import('@/shared/fx/LivingOrb/MiniOrb').then((mod) => ({ default: mod.MiniOrb })));

export interface WallHeaderProps {
  environment: string;
  counts: StatusCounts;
  now: Date;
  updatedAt: string | null;
  connection: WallConnectionState;
  onFullscreen?: () => void;
  /** FE-46: no update for too long. */
  stale?: boolean;
  /** Runtime controls (sound, notifications, kiosk). */
  controls?: ReactNode;
  /** FE-59 mini orb with the global state next to the status pill. */
  orb?: { monitors: readonly OrbMonitor[]; groups: readonly Group[]; uptime24h: number };
  /** FE-10: workspace name and sanitized logo next to the Orbit mark. */
  brand?: WorkspaceBranding;
}

const CONNECTION_NOTE = {
  mock: 'wall.connection.mock',
  closed: 'wall.connection.closed',
  connecting: 'wall.connection.connecting',
} as const;

export function WallHeader({ environment, counts, now, updatedAt, connection, onFullscreen, stale = false, controls, orb, brand }: WallHeaderProps) {
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
        {brand ? (
          <WorkspaceBrand name={brand.name} logoSvg={brand.logoSvg} />
        ) : (
          <>
            <OrbitMark />
            <span className="font-display text-[1.1rem] font-bold tracking-tight">{t('app.name')}</span>
          </>
        )}
        <span className="rounded-[0.4rem] border border-line-2 px-[0.45rem] py-[0.05rem] text-[0.78rem] text-muted">
          {environment}
        </span>
      </div>

      <div role="status" aria-live="polite" className="flex items-center gap-[0.5rem]">
        {orb && (
          <Suspense fallback={null}>
            <MiniOrb monitors={orb.monitors} groups={orb.groups} uptime24h={orb.uptime24h} />
          </Suspense>
        )}
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
        {controls}
        {onFullscreen && (
          <Button variant="ghost" onClick={onFullscreen} aria-label={t('wall.fullscreen')}>
            ⛶
          </Button>
        )}
      </div>
    </header>
  );
}
