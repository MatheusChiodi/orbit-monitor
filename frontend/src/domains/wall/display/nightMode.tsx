import { useTranslation } from 'react-i18next';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import { clampDim, isNightTime, type NightSchedule } from './nightSchedule';

export * from './nightSchedule';

/** FE-09: dim the wall between two local times. `dimTo` is the brightness kept (0.6 = 60 %). */
export interface NightModeOverlayProps {
  schedule: NightSchedule;
  now: Date;
  /** A DOWN incident without an owner lifts the dimming (exceptions first). */
  hasUnownedIncident?: boolean;
}

export function NightModeOverlay({ schedule, now, hasUnownedIncident = false }: NightModeOverlayProps) {
  const { t } = useTranslation();
  const level = useAnimationLevel();
  if (hasUnownedIncident || !isNightTime(schedule, now)) return null;
  const fade = level === 'off' ? 'transition-none' : 'transition-opacity duration-[600ms]';
  return (
    <>
      <div
        aria-hidden
        data-testid="night-mode"
        className={`fixed inset-0 z-40 bg-black ${fade}`}
        style={{ opacity: 1 - clampDim(schedule.dimTo), pointerEvents: 'none' }}
      />
      <p
        role="status"
        className="fixed bottom-[0.8rem] left-[0.8rem] z-50 m-0 rounded-[0.45rem] border border-line bg-s1 px-[0.6rem] py-[0.2rem] text-[0.75rem] text-muted"
      >
        {t('nightMode.label')}
      </p>
    </>
  );
}
