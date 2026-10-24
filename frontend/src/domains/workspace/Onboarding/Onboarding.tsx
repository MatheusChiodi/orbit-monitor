import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { AccessMode } from '@/shared/api/types';
import { IconChevronRight } from '@/shared/ui';

export interface OnboardingProps {
  mode: AccessMode;
  onStart: (type: 'HTTP' | 'SQL') => void;
}

const START = [
  { type: 'HTTP', title: 'ops.monitors.onboarding.url', hint: 'ops.monitors.onboarding.urlHint' },
  { type: 'SQL', title: 'ops.monitors.onboarding.sql', hint: 'ops.monitors.onboarding.sqlHint' },
] as const;

/** FE-37: the empty monitor list — one invitation, two ways to start; view-only clients learn where setup happens. */
export function Onboarding({ mode, onStart }: OnboardingProps) {
  const { t } = useTranslation();
  const ids = useId();
  return (
    <section data-surface="panel" aria-labelledby={`${ids}-title`} className="flex flex-col gap-4 rounded-md border border-line bg-s1 p-6">
      <div className="flex flex-col gap-1">
        <h2 id={`${ids}-title`} className="m-0 text-lg font-semibold">
          {t('ops.monitors.onboarding.title')}
        </h2>
        <p className="m-0 text-base text-muted">
          {mode === 'edit' ? t('ops.monitors.onboarding.body') : t('ops.monitors.onboarding.viewOnly')}
        </p>
      </div>
      {mode === 'edit' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {START.map((start, index) => (
            <button
              key={start.type}
              type="button"
              aria-describedby={`${ids}-${start.type}`}
              onClick={() => onStart(start.type)}
              className={`group flex items-center gap-3 rounded-md border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                index === 0 ? 'border-accent/60 bg-accent/8 hover:bg-accent/12' : 'border-line-2 bg-s2 hover:bg-s3'
              }`}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-md font-semibold text-text">{t(start.title)}</span>
                <span id={`${ids}-${start.type}`} className="text-sm text-muted">
                  {t(start.hint)}
                </span>
              </span>
              <IconChevronRight className="shrink-0 text-dim group-hover:text-text" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
