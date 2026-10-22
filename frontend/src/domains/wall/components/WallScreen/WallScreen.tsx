import type { ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { countByStatus, nearLimit } from '@/domains/monitor/status';
import type { WallSnapshot } from '@/shared/api/types';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import type { WallConnectionState } from '../../store';
import { alsoActive, groupRows, pickHero } from '../../selectors';
import { AlsoActive } from '../AlsoActive';
import { Hero } from '../Hero';
import { HeroCalm } from '../HeroCalm';
import { MonitorMatrix } from '../MonitorMatrix';
import { NearLimit } from '../NearLimit';
import { Timeline } from '../Timeline';
import { WallHeader } from '../WallHeader';
import { isStale } from '../StaleBadge';

export interface WallScreenProps {
  snapshot: WallSnapshot | null;
  now: Date;
  connection: WallConnectionState;
  freshEventIds: ReadonlySet<string>;
  onAcknowledge: (incidentId: string) => void;
  onFullscreen?: () => void;
  /** Last time data arrived; defaults to the snapshot time. */
  updatedAt?: string | null;
  controls?: ReactNode;
}

/**
 * 16:9 wall: the left side is action (hero, also active, near threshold), the right side is context
 * (matrix and timeline). On narrow screens it becomes one column in that same order.
 */
export function WallScreen({
  snapshot,
  now,
  connection,
  freshEventIds,
  onAcknowledge,
  onFullscreen,
  updatedAt,
  controls,
}: WallScreenProps) {
  const { t } = useTranslation();
  const heroMotion = useMotionPreset('hero');
  if (!snapshot) {
    return (
      <main
        role="status"
        aria-busy="true"
        data-skeleton
        className={`flex min-h-screen items-center justify-center text-muted ${heroMotion.level === 'off' ? '' : 'anim-shimmer'}`}
      >
        {t('wall.loading')}
      </main>
    );
  }

  const lastUpdate = updatedAt ?? snapshot.generatedAt;
  // Demo data never goes stale; live data greys out after 60 s without messages.
  const stale = connection !== 'mock' && isStale(lastUpdate, now);
  const counts = countByStatus(snapshot.monitors);
  const hero = pickHero(snapshot);
  const near = nearLimit(snapshot.monitors);
  const unowned = new Set(snapshot.incidents.filter((i) => !i.acknowledgedBy).map((i) => i.monitorId));

  return (
    <div className="wall-root" data-stale={stale ? 'true' : 'false'}>
      <WallHeader
        environment={snapshot.environment}
        brand={snapshot.branding}
        counts={counts}
        now={now}
        updatedAt={lastUpdate}
        stale={stale}
        controls={controls}
        connection={connection}
        onFullscreen={onFullscreen}
        orb={{ monitors: snapshot.monitors, groups: snapshot.groups, uptime24h: snapshot.uptime24h }}
      />
      <main className="wall-layout">
        <div className="wall-col wall-col--action">
          <div className="wall-hero">
            {/* Hero swap: the old hero fades out while the new one fades in, stacked in the same cell. */}
            <AnimatePresence initial={false}>
              <m.div
                key={hero ? hero.monitor.id : 'calm'}
                initial={heroMotion.initial}
                animate={heroMotion.animate}
                exit={heroMotion.exit}
                transition={heroMotion.transition}
                className="h-full [grid-area:1/1]"
              >
                {hero ? (
                  <Hero selection={hero} now={now} onAcknowledge={onAcknowledge} />
                ) : (
                  <HeroCalm
                    uptime24h={snapshot.uptime24h}
                    lastRecoveryAt={snapshot.lastRecoveryAt}
                    nearLimitCount={near.filter((n) => n.headroom < 0.25).length}
                    now={now}
                    monitors={snapshot.monitors}
                    groups={snapshot.groups}
                  />
                )}
              </m.div>
            </AnimatePresence>
          </div>
          <div className="wall-pair">
            <AlsoActive monitors={alsoActive(snapshot, hero?.monitor.id ?? null)} groups={snapshot.groups} now={now} />
            <NearLimit items={near} />
          </div>
        </div>
        <div className="wall-col wall-col--context">
          <div className="wall-matrix">
            <MonitorMatrix rows={groupRows(snapshot)} unownedMonitorIds={unowned} />
          </div>
          <div className="wall-timeline">
            <Timeline events={snapshot.timeline} freshIds={freshEventIds} />
          </div>
        </div>
      </main>
    </div>
  );
}
