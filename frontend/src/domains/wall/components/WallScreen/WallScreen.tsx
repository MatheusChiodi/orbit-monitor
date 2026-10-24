import { lazy, Suspense, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useNextEscalationStep, type LoadEscalation } from '@/domains/alerting/escalation/escalationApi';
import { useOnCallNow, type LoadOnCall } from '@/domains/alerting/oncall/oncallApi';
import { countByStatus, nearLimit } from '@/domains/monitor/status';
import type { LayoutBlock } from '@/domains/workspace/layout/grid';
import type { WallSnapshot } from '@/shared/api/types';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import type { WallConnectionState } from '../../store';
import { createMonitorActionHandler } from '../../actions/monitorActions';
import { isClassicArrangement } from '../../layout/wallLayout';
import { alsoActive, groupRows, nearLimitEmpty, pickHero } from '../../selectors';
import { HeroSwap } from '../HeroSwap';
import type { LoadHistory } from '../SeriesBlock';
import { WallHeader } from '../WallHeader';
import { isStale } from '../StaleBadge';

/** Saved layouts other than the built-in one load their grid and blocks on demand (wall budget). */
/**
 * Wall budget: the header and the hero (state, value, rule, Acknowledge) are in the first load; the
 * supporting panels arrive right after first paint, each in its own reserved slot (no layout shift).
 */
const AlsoActive = lazy(() => import('../AlsoActive').then((mod) => ({ default: mod.AlsoActive })));
const NearLimit = lazy(() => import('../NearLimit').then((mod) => ({ default: mod.NearLimit })));
const MonitorMatrix = lazy(() => import('../MonitorMatrix').then((mod) => ({ default: mod.MonitorMatrix })));
const Timeline = lazy(() => import('../Timeline').then((mod) => ({ default: mod.Timeline })));
/** Only a fresh install shows it (wall budget). */
const WallEmpty = lazy(() => import('../WallEmpty').then((mod) => ({ default: mod.WallEmpty })));
const LayoutGrid = lazy(() => import('../LayoutGrid').then((mod) => ({ default: mod.LayoutGrid })));

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
  /** FE-11: blocks of the layout on screen; the built-in arrangement keeps the classic wall. */
  blocks?: readonly LayoutBlock[];
  /** Changes when the playlist shows another layout: the two layouts cross-fade (FE-19). */
  layoutKey?: string;
  /** FE-40: next escalation step names (BE-27). */
  loadEscalation?: LoadEscalation;
  /** BE-33: who is on call, for clock blocks. */
  loadOnCall?: LoadOnCall;
  /** FE-58: history of series blocks with a range. */
  loadHistory?: LoadHistory;
  /** Where card actions open the console (FE-55); defaults to `location.assign`. */
  onNavigate?: (url: string) => void;
  /** Console address shown on an empty install; defaults to this server. */
  consoleUrl?: string;
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
  blocks,
  layoutKey = 'default',
  loadEscalation,
  loadOnCall,
  loadHistory,
  onNavigate = (url) => window.location.assign(url),
  consoleUrl = `${window.location.origin}/`,
}: WallScreenProps) {
  const { t } = useTranslation();
  const heroMotion = useMotionPreset('hero');
  const hero = snapshot ? pickHero(snapshot) : null;
  const nextStep = useNextEscalationStep(hero?.incident ?? null, loadEscalation);
  const classic = !blocks || isClassicArrangement(blocks);
  // BE-33: on-call comes with the snapshot; older backends are asked over REST.
  const hasClock = !classic && Boolean(blocks?.some((b) => b.kind === 'clock'));
  const fromSnapshot = snapshot?.onCall;
  const fetched = useOnCallNow(loadOnCall, hasClock && !fromSnapshot);
  const onCall = fromSnapshot
    ? fromSnapshot.map((e) => ({ scheduleId: e.schedule, scheduleName: e.schedule, person: e.person, shiftEndsAt: e.shiftEndsAt }))
    : fetched;
  if (!snapshot) {
    return (
      <main
        role="status"
        aria-busy="true"
        data-skeleton
        className={`flex min-h-screen items-center justify-center text-muted ${heroMotion.level === 'off' ? '' : 'anim-shimmer'}`}
      >
        {connection === 'closed' ? t('wall.waitingServer') : t('wall.loading')}
      </main>
    );
  }

  const lastUpdate = updatedAt ?? snapshot.generatedAt;
  // Demo data never goes stale; live data greys out after 60 s without messages.
  const stale = connection !== 'mock' && isStale(lastUpdate, now);
  const counts = countByStatus(snapshot.monitors);
  const near = nearLimit(snapshot.monitors);
  const unowned = new Set(snapshot.incidents.filter((i) => !i.acknowledgedBy).map((i) => i.monitorId));
  const onMonitorAction = createMonitorActionHandler(snapshot, { onAcknowledge, navigate: onNavigate });
  const empty = snapshot.monitors.length === 0;

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
      {/* FE-19: when the playlist switches layouts, the old one fades out while the new one fades in. */}
      {empty ? (
        <Suspense fallback={null}>
          <WallEmpty consoleUrl={consoleUrl} />
        </Suspense>
      ) : (
        <div className="wall-stage">
          <AnimatePresence>
            <m.div
              key={layoutKey}
              data-layout={layoutKey}
              initial={heroMotion.initial}
              animate={heroMotion.animate}
              exit={heroMotion.exit}
              transition={heroMotion.transition}
              className="wall-stage__layout"
            >
              {classic ? (
                <main className="wall-layout">
                  <div className="wall-col wall-col--action">
                    <div className="wall-hero">
                      <HeroSwap snapshot={snapshot} hero={hero} now={now} onAcknowledge={onAcknowledge} nextStep={nextStep} />
                    </div>
                    <div className="wall-pair">
                      <Suspense fallback={null}>
                        <AlsoActive monitors={alsoActive(snapshot, hero?.monitor.id ?? null)} groups={snapshot.groups} now={now} />
                      </Suspense>
                      <Suspense fallback={null}>
                        <NearLimit items={near} empty={nearLimitEmpty(snapshot.monitors)} />
                      </Suspense>
                    </div>
                  </div>
                  <div className="wall-col wall-col--context">
                    <div className="wall-matrix">
                      <Suspense fallback={null}>
                        <MonitorMatrix rows={groupRows(snapshot)} unownedMonitorIds={unowned} onMonitorAction={onMonitorAction} />
                      </Suspense>
                    </div>
                    <div className="wall-timeline">
                      <Suspense fallback={null}>
                        <Timeline events={snapshot.timeline} freshIds={freshEventIds} />
                      </Suspense>
                    </div>
                  </div>
                </main>
              ) : (
                <Suspense fallback={null}>
                  <LayoutGrid
                    blocks={blocks ?? []}
                    snapshot={snapshot}
                    hero={hero}
                    now={now}
                    freshEventIds={freshEventIds}
                    onAcknowledge={onAcknowledge}
                    nextStep={nextStep}
                    onCall={onCall}
                    loadHistory={loadHistory}
                    onMonitorAction={onMonitorAction}
                  />
                </Suspense>
              )}
            </m.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
