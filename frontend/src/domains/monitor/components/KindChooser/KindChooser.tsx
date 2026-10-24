import { useId, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, IconChevronDown, IconChevronRight, IconFile, IconMonitor, type IconProps } from '@/shared/ui';
import { MONITOR_KINDS, type MonitorKind } from '../../form';
import type { MonitorTemplate } from '../../templates';
import { TemplatePicker } from '../TemplatePicker';

export interface KindChooserProps {
  onChoose: (kind: MonitorKind) => void;
  onTemplate: (template: MonitorTemplate) => void;
}

const MAIN: { kind: MonitorKind; title: 'website' | 'database'; icon: ComponentType<IconProps> }[] = [
  { kind: 'HTTP', title: 'website', icon: IconMonitor },
  { kind: 'SQL', title: 'database', icon: IconFile },
];
const OTHER = MONITOR_KINDS.filter((k) => k !== 'HTTP' && k !== 'SQL');

/** Step 0 of a new monitor: two big choices, the other kinds behind a disclosure, and templates. */
export function KindChooser({ onChoose, onTemplate }: KindChooserProps) {
  const { t } = useTranslation();
  const [more, setMore] = useState(false);
  const otherId = useId();
  return (
    <div className="flex flex-col gap-6">
      <h2 className="m-0 text-lg font-semibold text-text">{t('monitorForm.flow.chooseTitle')}</h2>
      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
        {MAIN.map(({ kind, title, icon: Icon }) => (
          <li key={kind}>
            <button
              type="button"
              onClick={() => onChoose(kind)}
              className="group flex h-full w-full items-start gap-4 rounded-md border border-line-2 bg-s1 p-5 text-left transition-colors hover:border-accent hover:bg-s2 focus-visible:border-accent"
            >
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-sm bg-s3 text-accent">
                <Icon size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-md font-semibold text-text">{t(`monitorForm.flow.${title}`)}</span>
                <span className="text-base text-muted">{t(`monitorForm.flow.${title}Hint`)}</span>
              </span>
              <IconChevronRight size={20} className="mt-2 shrink-0 text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          aria-expanded={more}
          aria-controls={otherId}
          onClick={() => setMore(!more)}
          className="flex w-fit items-center gap-2 rounded-sm px-1 text-base font-medium text-text hover:text-accent"
        >
          <IconChevronDown size={16} className={`transition-transform ${more ? 'rotate-180' : ''}`} />
          {t('monitorForm.flow.otherKinds')}
        </button>
        {!more && <p className="m-0 text-sm text-muted">{t('monitorForm.flow.otherKindsHint')}</p>}
        {more && (
          <ul id={otherId} className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4">
            {OTHER.map((kind) => (
              <li key={kind}>
                <button
                  type="button"
                  onClick={() => onChoose(kind)}
                  className="h-11 w-full rounded-sm border border-line-2 bg-s1 px-3 text-left text-base text-text hover:border-accent hover:bg-s2"
                >
                  {t(`monitorForm.types.${kind}`)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Card>
        <TemplatePicker showBlank={false} title={t('monitorForm.flow.templates')} onPick={(template) => template && onTemplate(template)} />
      </Card>
    </div>
  );
}
