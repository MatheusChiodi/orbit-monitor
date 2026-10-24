import { useTranslation } from 'react-i18next';
import { formatReading } from '@/domains/monitor/rules';
import type { MonitorView } from '@/shared/api/types';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { FlashValue } from '@/shared/ui/FlashValue';
import { Panel } from '@/shared/ui/Panel';
import { StatusDot } from '@/shared/ui/StatusPill';
import { TEXT_CLASS } from '@/shared/ui/tones';

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
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-0.5 font-semibold">{t('wall.blocks.tableColumns.name')}</th>
            <th className="py-0.5 font-semibold">{t('wall.blocks.tableColumns.status')}</th>
            <th className="py-0.5 text-right font-semibold">{t('wall.blocks.tableColumns.value')}</th>
          </tr>
        </thead>
        <tbody>
          {monitors.map((m) => (
            <tr key={m.id} data-status={m.status} className="border-t border-line">
              <td className="py-1">
                <SafeValue value={m.name} surface="wall" />
              </td>
              <td className={`py-1 ${TEXT_CLASS[m.status]}`}>
                <span className="inline-flex items-center gap-1">
                  <StatusDot status={m.status} />
                  {t(`status.label.${m.status}`)}
                </span>
              </td>
              <td className="py-1 text-right font-mono">
                <FlashValue value={m.value}>{formatReading(m.value, m.unit, locale)}</FlashValue>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
