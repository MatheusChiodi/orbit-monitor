import { useTranslation } from 'react-i18next';
import type { MonitorView } from '@/shared/api/types';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Panel, StatusDot } from '@/shared/ui';

export interface IndicatorsBlockProps {
  monitors: readonly MonitorView[];
}

/** One status dot per monitor, with its name and state in text (never color alone). */
export function IndicatorsBlock({ monitors }: IndicatorsBlockProps) {
  const { t } = useTranslation();
  return (
    <Panel title={t('wall.blocks.indicators')} className="h-full">
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-[0.4rem] p-0">
        {monitors.map((m) => (
          <li key={m.id} data-status={m.status} className="flex min-w-0 items-center gap-[0.4rem] text-[0.8rem]">
            <StatusDot status={m.status} />
            <SafeValue value={m.name} surface="wall" className="min-w-0 truncate" />
            <span className="sr-only">{t(`status.label.${m.status}`)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
