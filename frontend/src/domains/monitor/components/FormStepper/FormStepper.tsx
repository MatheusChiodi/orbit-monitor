import { useTranslation } from 'react-i18next';
import { IconCheck } from '@/shared/ui';

export interface FormStepperProps<S extends string> {
  steps: readonly S[];
  current: S;
  /** Steps with a problem that blocks saving. */
  invalid?: readonly S[];
  label: (step: S) => string;
  onSelect: (step: S) => void;
}

/** Numbered steps of a form; any step can be opened at any time (saving is never gated on visiting them). */
export function FormStepper<S extends string>({ steps, current, invalid = [], label, onSelect }: FormStepperProps<S>) {
  const { t } = useTranslation();
  const index = steps.indexOf(current);
  return (
    <nav aria-label={t('monitorForm.flow.stepsLabel')}>
      <ol className="m-0 flex list-none gap-1 p-0">
        {steps.map((step, i) => {
          const active = step === current;
          const done = i < index;
          const bad = invalid.includes(step);
          return (
            <li key={step} className={`min-w-0 ${active ? 'flex-auto' : 'flex-none sm:flex-auto'}`}>
              <button
                type="button"
                aria-current={active ? 'step' : undefined}
                onClick={() => onSelect(step)}
                className={`flex w-full items-center gap-2 rounded-sm border-b-2 px-2 py-2 text-left text-sm transition-colors ${
                  active ? 'border-accent text-text' : 'border-line text-muted hover:text-text'
                }`}
              >
                <span
                  aria-hidden
                  className={`grid size-6 shrink-0 place-items-center rounded-full font-mono text-xs ${
                    bad ? 'bg-down/20 text-down-text' : active ? 'bg-accent text-on-accent' : done ? 'bg-s3 text-text' : 'bg-s2 text-muted'
                  }`}
                >
                  {done && !bad ? <IconCheck size={16} /> : i + 1}
                </span>
                <span className={`truncate font-medium ${active ? '' : 'sr-only sm:not-sr-only'}`}>{label(step)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
