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
import { Button } from '@/shared/ui/Button';
import { FlashValue } from '@/shared/ui/FlashValue';
import { StatusPill } from '@/shared/ui/StatusPill';
import { DOT_CLASS } from '@/shared/ui/tones';
import type { WallConnectionState } from '../../store';
import { StaleBadge } from '../StaleBadge';
import { IconFullscreen } from '../WallIcons';

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
  // A fresh install has nothing to be "operational": say so, in grey, and skip the zero counters.
  const empty = counts.total === 0;

  return (
    <header data-motion-level={level} className="flex min-h-13 flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-4 py-2">
      <div className="flex items-center gap-2">
        {brand ? (
          <WorkspaceBrand name={brand.name} logoSvg={brand.logoSvg} />
        ) : (
          <>
            <OrbitMark />
            <span className="display-wide text-lg">{t('app.name')}</span>
          </>
        )}
        <span className="rounded-sm border border-line-2 px-2 py-0.5 text-xs text-muted">
          {environment}
        </span>
      </div>

      <div role="status" aria-live="polite" className="flex items-center gap-2">
        {orb && !empty && (
          <Suspense fallback={null}>
            <MiniOrb monitors={orb.monitors} groups={orb.groups} uptime24h={orb.uptime24h} />
          </Suspense>
        )}
        {empty ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-s2 px-3 py-0.5 text-sm font-semibold text-muted">
            <span aria-hidden className={`size-2 rounded-full ${DOT_CLASS.neutral}`} />
            {t('wall.empty.status')}
          </span>
        ) : (
          <StatusPill status={statusFromCounts(counts)}>{translate(t, globalPhrase(counts))}</StatusPill>
        )}
      </div>

      {!empty && (
        <ul className="m-0 flex list-none gap-4 p-0 font-mono text-base" aria-label={t('status.counts')}>
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
      )}

      <div className="ml-auto flex items-center gap-4">
        {note && <span className="text-xs text-warn-text">{note}</span>}
        {updatedAt && stale && <StaleBadge updatedAt={updatedAt} now={now} />}
        {updatedAt && !stale && (
          <span className="text-xs text-muted">
            {t('wall.updated', { when: formatRelative(updatedAt, now, locale) })}
          </span>
        )}
        <time dateTime={now.toISOString()} className="font-mono text-lg font-medium">
          {formatClock(now)}
        </time>
        {controls}
        {onFullscreen && (
          <Button variant="ghost" size="sm" iconOnly onClick={onFullscreen} aria-label={t('wall.fullscreen')}>
            <IconFullscreen />
          </Button>
        )}
      </div>
    </header>
  );
}
