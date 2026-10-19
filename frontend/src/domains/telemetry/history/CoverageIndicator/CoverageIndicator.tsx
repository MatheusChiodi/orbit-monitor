import { useTranslation } from 'react-i18next';
import { rangeCoverage, type HistoryRange, type StoreCoverage } from '../range';

export interface CoverageIndicatorProps {
  coverage: StoreCoverage;
  range: Pick<HistoryRange, 'from' | 'to'>;
}

/**
 * FE-58: states the retention window ("History available: last 30 days") and, when the selected
 * period starts before the oldest stored data, how much of it is covered, as text and a meter.
 */
export function CoverageIndicator({ coverage, range }: CoverageIndicatorProps) {
  const { t, i18n } = useTranslation();
  const covered = rangeCoverage(coverage, range);
  const percent = Math.round(covered.fraction * 100);
  const parts = [t('historyRange.coverage.available', { days: coverage.retentionDays })];
  if (!covered.coveredFrom) {
    parts.push(t('historyRange.coverage.none'));
  } else if (!covered.complete) {
    const since = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
      .format(covered.coveredFrom);
    parts.push(t('historyRange.coverage.partial', { percent, since }));
  }
  if (!coverage.rawWritesEnabled) parts.push(t('historyRange.coverage.rawPaused'));

  return (
    <div className="flex flex-col gap-[0.3rem]">
      <p role="note" className="m-0 text-[0.78rem] text-muted">
        {parts.join(' · ')}
      </p>
      {!covered.complete && (
        <div
          role="meter"
          aria-label={t('historyRange.coverage.meter')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-[0.3rem] w-full overflow-hidden rounded-full bg-s3"
        >
          <div className="ml-auto h-full bg-info" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}
