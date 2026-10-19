import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/shared/format';
import { useLocale } from '@/shared/i18n/useLocale';
import { SafeValue, safeText } from '@/shared/privacy';
import { VizFrame } from '../core/VizFrame';
import { ruleHolds } from '../core/format';
import { markTransition, useVizLevel } from '../core/useVizLevel';
import type { ModeProps, VizRule, VizValue } from '../types';

function violates(row: Record<string, VizValue>, rule: VizRule | undefined): boolean {
  if (!rule) return false;
  const value = row[rule.field];
  return typeof value === 'number' && !ruleHolds(value, rule);
}

/** Mode 17: live table; rows that break the rule are highlighted and say so in text. */
export function LiveTable({ data, animation, className }: ModeProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const level = useVizLevel(animation);
  const columns = data.columns ?? [];
  const rows = data.rows ?? [];
  // The "violates" badge sits next to the ruled value, or in the last column when that field is not shown.
  const badgeColumn = data.rule && columns.includes(data.rule.field) ? data.rule.field : columns[columns.length - 1];
  const format = (v: VizValue | undefined) => (typeof v === 'number' ? formatNumber(v, locale) : String(v));
  return (
    <VizFrame mode="live-table" level={level} label={data.label} status={data.status} empty={rows.length === 0} className={className}>
      <div className="overflow-x-auto">
        <table aria-label={safeText(data.label)} className="w-full border-collapse text-left text-[0.8rem]">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col" className="border-b border-line px-[0.5rem] py-[0.3rem] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted">
                  {safeText(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const bad = violates(row, data.rule);
              return (
                <tr key={i} data-violates={bad ? 'true' : undefined} className={`${bad ? 'bg-down/12' : ''} ${markTransition(level)}`}>
                  {columns.map((c) => (
                    <td key={c} className="border-b border-line px-[0.5rem] py-[0.3rem] font-mono tabular-nums">
                      <SafeValue value={row[c] ?? null} field={c} format={(v) => format(v as VizValue)} />
                      {bad && c === badgeColumn && (
                        <span className="ml-[0.5rem] rounded-[0.3rem] bg-down/20 px-[0.35rem] font-sans text-[0.68rem] text-down-text">{t('viz.table.violates')}</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </VizFrame>
  );
}
