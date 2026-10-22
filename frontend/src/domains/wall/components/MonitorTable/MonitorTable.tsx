import { useTranslation } from 'react-i18next';
import { formatReading } from '@/domains/monitor/rules';
import type { MonitorView } from '@/shared/api/types';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { FlashValue, Panel, StatusDot, TEXT_CLASS } from '@/shared/ui';

export interface MonitorTableProps {
  monitors: readonly MonitorView[];
}

/**
 * Live table block: one row per monitor (name, state, main value). The wall snapshot never carries
 * result rows, so personal or card data cannot reach this table (docs/04-data-protection.md).
 */
export function MonitorTable({ monitors }: MonitorTableProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  return (
    <Panel title={t('wall.blocks.table')} className="h-full">
      <table className="w-full border-collapse text-[0.82rem]">
        <thead>
          <tr className="text-left text-[0.7rem] text-muted">
            <th className="py-[0.2rem] font-semibold">{t('wall.blocks.tableColumns.name')}</th>
            <th className="py-[0.2rem] font-semibold">{t('wall.blocks.tableColumns.status')}</th>
            <th className="py-[0.2rem] text-right font-semibold">{t('wall.blocks.tableColumns.value')}</th>
          </tr>
        </thead>
        <tbody>
          {monitors.map((m) => (
            <tr key={m.id} data-status={m.status} className="border-t border-line">
              <td className="py-[0.25rem]">
                <SafeValue value={m.name} surface="wall" />
              </td>
              <td className={`py-[0.25rem] ${TEXT_CLASS[m.status]}`}>
                <span className="inline-flex items-center gap-[0.3rem]">
                  <StatusDot status={m.status} />
                  {t(`status.label.${m.status}`)}
                </span>
              </td>
              <td className="py-[0.25rem] text-right font-mono">
                <FlashValue value={m.value}>{formatReading(m.value, m.unit, locale)}</FlashValue>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
