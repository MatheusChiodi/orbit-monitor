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
  const fade = level === 'off' ? 'transition-none' : 'transition-opacity duration-600';
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
        className="fixed bottom-3 left-3 z-50 m-0 rounded-sm border border-line bg-s1 px-2 py-0.5 text-xs text-muted"
      >
        {t('nightMode.label')}
      </p>
    </>
  );
}
