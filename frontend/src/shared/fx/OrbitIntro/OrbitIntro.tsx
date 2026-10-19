import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { IntroId } from '../../../../remotion/compositions/registry';
import { useFxLevel } from '../FxProvider';
import { TiltCard } from '../TiltCard';

const IntroPlayer = lazy(() => import('./IntroPlayer').then((m) => ({ default: m.IntroPlayer })));

export interface OrbitIntroProps {
  id: IntroId;
  /** Frame it in a glass TiltCard (onboarding and empty states). */
  tilt?: boolean;
  className?: string;
}

function PlayIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[1.1rem]" fill="currentColor">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

/**
 * Short Remotion composition for onboarding and empty states (docs/03-design.md §4.2).
 * `expressive` autoplays; `standard` shows a poster and loads Remotion only on "Play"; `off` and
 * `minimal` render nothing.
 */
export function OrbitIntro({ id, tilt = false, className = '' }: OrbitIntroProps) {
  const { t } = useTranslation();
  const fx = useFxLevel();
  const [requested, setRequested] = useState(false);
  if (fx.level === 'off' || fx.level === 'minimal') return null;
  const playing = fx.intros || requested;

  const figure = (
    <figure aria-label={t('fx.intro.label')} className={`m-0 overflow-hidden rounded-[0.7rem] border border-line bg-bg ${className}`}>
      {playing ? (
        <Suspense fallback={<div className="aspect-video w-full bg-bg" />}>
          <IntroPlayer id={id} />
        </Suspense>
      ) : (
        <div className="relative flex aspect-video w-full items-center justify-center bg-[radial-gradient(60%_60%_at_50%_40%,color-mix(in_srgb,var(--info)_10%,transparent),transparent)]">
          <button
            type="button"
            onClick={() => setRequested(true)}
            className="inline-flex items-center gap-[0.5rem] rounded-full border border-line-2 bg-s2/80 px-[1rem] py-[0.55rem] text-[0.9rem] text-text transition-colors duration-[120ms] hover:border-info/60 hover:bg-s3 active:scale-[0.98]"
          >
            <PlayIcon />
            {t('fx.intro.play')}
          </button>
        </div>
      )}
    </figure>
  );
  return tilt ? <TiltCard className="p-[0.5rem]">{figure}</TiltCard> : figure;
}
