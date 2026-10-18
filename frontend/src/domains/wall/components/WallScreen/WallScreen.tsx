import { AnimatePresence, motion } from 'motion/react';
import { countByStatus, nearLimit } from '@/domains/monitor/status';
import type { WallSnapshot } from '@/shared/api/types';
import { heroTransition, heroVariants } from '@/shared/motion';
import type { WallConnectionState } from '../../store';
import { alsoActive, groupRows, pickHero } from '../../selectors';
import { AlsoActive } from '../AlsoActive';
import { Hero } from '../Hero';
import { HeroCalm } from '../HeroCalm';
import { MonitorMatrix } from '../MonitorMatrix';
import { NearLimit } from '../NearLimit';
import { Timeline } from '../Timeline';
import { WallHeader } from '../WallHeader';

export interface WallScreenProps {
  snapshot: WallSnapshot | null;
  now: Date;
  connection: WallConnectionState;
  freshEventIds: ReadonlySet<string>;
  onAcknowledge: (incidentId: string) => void;
  onFullscreen?: () => void;
}

/**
 * Parede 16:9: esquerda é ação (herói, também ativos, perto do limite), direita é contexto
 * (matriz e linha do tempo). Em telas estreitas vira uma coluna nessa mesma ordem.
 */
export function WallScreen({ snapshot, now, connection, freshEventIds, onAcknowledge, onFullscreen }: WallScreenProps) {
  if (!snapshot) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted" aria-busy="true">
        Carregando a parede…
      </main>
    );
  }

  const counts = countByStatus(snapshot.monitors);
  const hero = pickHero(snapshot);
  const near = nearLimit(snapshot.monitors);
  const unowned = new Set(snapshot.incidents.filter((i) => !i.acknowledgedBy).map((i) => i.monitorId));

  return (
    <div className="wall-root">
      <WallHeader
        environment={snapshot.environment}
        counts={counts}
        now={now}
        updatedAt={snapshot.generatedAt}
        connection={connection}
        onFullscreen={onFullscreen}
      />
      <main className="wall-layout">
        <div className="wall-col wall-col--action">
          <div className="wall-hero">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={hero ? hero.monitor.id : 'calm'}
                layoutId="wall-hero"
                variants={heroVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={heroTransition}
                className="h-full"
              >
                {hero ? (
                  <Hero selection={hero} now={now} onAcknowledge={onAcknowledge} />
                ) : (
                  <HeroCalm
                    uptime24h={snapshot.uptime24h}
                    lastRecoveryAt={snapshot.lastRecoveryAt}
                    nearLimitCount={near.filter((n) => n.headroom < 0.25).length}
                    now={now}
                  />
                )}
              </motion.div>
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
