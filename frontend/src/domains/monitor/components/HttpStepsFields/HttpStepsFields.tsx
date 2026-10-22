import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { HttpMethod } from '@/shared/api/types';
import { AnimatedItem, Button, INPUT_CLASS, SELECT_CLASS } from '@/shared/ui';
import { emptyStep, type StepDraft } from '../../form';
import { FormField } from '../FormField';

export interface HttpStepsFieldsProps {
  steps: readonly StepDraft[];
  onChange: (steps: StepDraft[]) => void;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'HEAD'];
const AREA = `${INPUT_CLASS} h-auto min-h-[3.2rem] py-[0.4rem] font-mono`;

/** BE-07: ordered HTTP steps; each can extract JSONPath variables used later as `${step.var}`. */
export function HttpStepsFields({ steps, onChange }: HttpStepsFieldsProps) {
  const { t } = useTranslation();
  const update = (index: number, patch: Partial<StepDraft>) => onChange(steps.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  return (
    <div className="flex flex-col gap-[0.6rem]">
      <ol aria-label={t('monitorForm.steps')} className="m-0 flex list-none flex-col gap-[0.6rem] p-0">
        <AnimatePresence initial={false}>
          {steps.map((step, index) => (
            <AnimatedItem key={index} index={index} count={steps.length} className="flex flex-col gap-[0.5rem] rounded-[0.6rem] border border-line p-[0.7rem]">
              <div className="flex items-center justify-between">
                <span className="section-label">{t('monitorForm.step', { index: index + 1 })}</span>
                {steps.length > 1 && (
                  <Button variant="ghost" onClick={() => onChange(steps.filter((_, i) => i !== index))}>
                    {t('monitorForm.removeStep', { index: index + 1 })}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-[0.5rem] sm:grid-cols-[10rem_6rem_1fr]">
                <FormField label={t('monitorForm.stepName')}>
                  {(id) => <input id={id} className={`${INPUT_CLASS} font-mono`} value={step.name} onChange={(e) => update(index, { name: e.target.value })} />}
                </FormField>
                <FormField label={t('form.method')}>
                  {(id) => (
                    <select id={id} className={`${SELECT_CLASS} font-mono`} value={step.method} onChange={(e) => update(index, { method: e.target.value as HttpMethod })}>
                      {METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  )}
                </FormField>
                <FormField label={t('form.url')}>
                  {(id) => <input id={id} className={`${INPUT_CLASS} font-mono`} value={step.url} onChange={(e) => update(index, { url: e.target.value })} />}
                </FormField>
              </div>
              <FormField label={t('form.headers')}>
                {(id) => <textarea id={id} className={AREA} value={step.headersText} onChange={(e) => update(index, { headersText: e.target.value })} />}
              </FormField>
              {(step.method === 'POST' || step.method === 'PUT') && (
                <FormField label={t('form.body')}>
                  {(id) => <textarea id={id} className={AREA} value={step.body} onChange={(e) => update(index, { body: e.target.value })} />}
                </FormField>
              )}
              <FormField label={t('monitorForm.extract')}>
                {(id) => (
                  <textarea id={id} className={AREA} placeholder="token = $.access_token" value={step.extractText} onChange={(e) => update(index, { extractText: e.target.value })} />
                )}
              </FormField>
            </AnimatedItem>
          ))}
        </AnimatePresence>
      </ol>
      <div>
        <Button onClick={() => onChange([...steps, emptyStep()])}>{t('monitorForm.addStep')}</Button>
      </div>
      <p className="m-0 text-[0.75rem] text-dim">{t('monitorForm.stepsNote')}</p>
    </div>
  );
}
