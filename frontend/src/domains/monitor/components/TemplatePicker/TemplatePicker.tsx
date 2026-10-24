import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui';
import { MONITOR_TEMPLATES, type MonitorTemplate } from '../../templates/templates';

export interface TemplatePickerProps {
  /** Chosen template, or null for a blank monitor. */
  onPick: (template: MonitorTemplate | null) => void;
  /** False when the screen already offers a blank start (the kind chooser). */
  showBlank?: boolean;
  title?: string;
}

const BLANK = 'blank';

/** FE-32: radio cards (native radios, so arrows move between them) to start a monitor from a template. */
export function TemplatePicker({ onPick, showBlank = true, title }: TemplatePickerProps) {
  const { t } = useTranslation();
  const name = useId();
  const titleId = useId();
  const [choice, setChoice] = useState<string>(showBlank ? BLANK : (MONITOR_TEMPLATES[0]?.id ?? BLANK));
  const options = [
    ...(showBlank ? [{ id: BLANK, label: t('templates.blank') }] : []),
    ...MONITOR_TEMPLATES.map((template) => ({ id: template.id, label: t(template.nameKey) })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <h2 id={titleId} className="section-label m-0">
        {title ?? t('templates.title')}
      </h2>
      <div role="radiogroup" aria-labelledby={titleId} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-base ${choice === option.id ? 'border-accent bg-accent/10' : 'border-line-2 bg-s1 hover:bg-s2'}`}
          >
            <input type="radio" name={name} value={option.id} checked={choice === option.id} onChange={() => setChoice(option.id)} />
            {option.label}
          </label>
        ))}
      </div>
      <div>
        <Button variant="secondary" onClick={() => onPick(choice === BLANK ? null : (MONITOR_TEMPLATES.find((m) => m.id === choice) ?? null))}>
          {t('templates.use')}
        </Button>
      </div>
    </div>
  );
}
