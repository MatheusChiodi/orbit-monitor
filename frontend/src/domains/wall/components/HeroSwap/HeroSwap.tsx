import { AnimatePresence, m } from 'motion/react';
import { nearLimit } from '@/domains/monitor/status';
import type { WallSnapshot } from '@/shared/api/types';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import type { HeroSelection } from '../../selectors';
import { Hero } from '../Hero';
import { HeroCalm } from '../HeroCalm';

export interface HeroSwapProps {
  snapshot: WallSnapshot;
  hero: HeroSelection | null;
  now: Date;
  onAcknowledge: (incidentId: string) => void;
  nextStep?: string | null;
}

/** Hero swap: the old hero fades out while the new one fades in, stacked in the same cell. */
export function HeroSwap({ snapshot, hero, now, onAcknowledge, nextStep = null }: HeroSwapProps) {
  const heroMotion = useMotionPreset('hero');
  return (
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
          <Hero selection={hero} now={now} onAcknowledge={onAcknowledge} nextStep={nextStep} />
        ) : (
          <HeroCalm
            uptime24h={snapshot.uptime24h}
            lastRecoveryAt={snapshot.lastRecoveryAt}
            nearLimitCount={nearLimit(snapshot.monitors).filter((n) => n.headroom < 0.25).length}
            now={now}
            monitors={snapshot.monitors}
            groups={snapshot.groups}
          />
        )}
      </m.div>
    </AnimatePresence>
  );
}
