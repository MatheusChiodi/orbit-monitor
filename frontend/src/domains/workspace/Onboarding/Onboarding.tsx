import { useTranslation } from 'react-i18next';
import type { AccessMode } from '@/shared/api/types';
import { AnimatedItem, Button, Panel } from '@/shared/ui';
import { onboardingSteps, type OnboardingResources } from './onboardingSteps';

export interface OnboardingProps {
  resources: OnboardingResources;
  mode: AccessMode;
  onStart: (type: 'HTTP' | 'SQL') => void;
}

/** FE-37: guided first monitor; view-only clients are told setup happens on the Orbit machine. */
export function Onboarding({ resources, mode, onStart }: OnboardingProps) {
  const { t } = useTranslation();
  const steps = onboardingSteps(resources);
  return (
    <Panel>
      <h2 className="m-0 font-display text-[1.4rem] font-bold tracking-tight">{t('onboarding.title')}</h2>
      <ol aria-label={t('onboarding.steps')} className="m-0 mt-[0.6rem] flex list-none flex-col gap-[0.4rem] p-0">
        {steps.map((step, index) => (
          <AnimatedItem
            key={step.id}
            index={index}
            count={steps.length}
            aria-label={t(`onboarding.${step.id}`)}
            className="flex items-center gap-[0.6rem] text-[0.9rem]"
          >
            <span className="font-mono text-[0.8rem] text-dim">{index + 1}.</span>
            <span className={step.done ? 'text-muted line-through' : ''}>{t(`onboarding.${step.id}`)}</span>
            {step.done && <span className="text-[0.75rem] font-semibold text-ok-text">{t('onboarding.done')}</span>}
          </AnimatedItem>
        ))}
      </ol>
      {mode === 'edit' ? (
        <div className="mt-[0.8rem] flex flex-wrap gap-[0.5rem]">
          <Button variant="primary" onClick={() => onStart('HTTP')}>
            {t('onboarding.http')}
          </Button>
          <Button variant="primary" onClick={() => onStart('SQL')}>
            {t('onboarding.sql')}
          </Button>
        </div>
      ) : (
        <p className="m-0 mt-[0.8rem] text-[0.85rem] text-muted">{t('onboarding.viewOnly')}</p>
      )}
    </Panel>
  );
}
