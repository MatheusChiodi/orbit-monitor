import { useTranslation } from 'react-i18next';

export interface HistoryNoticeProps {
  windowHours: number;
  /** Period the screen asked for (e.g. 30 d SLA). */
  requestedHours?: number;
  /** Hours actually recorded since Orbit started. */
  coverageHours?: number;
}

function period(hours: number): string {
  return hours >= 24 && hours % 24 === 0 ? `${hours / 24} d` : `${hours} h`;
}

/** States how much history exists, since Orbit keeps runtime data in memory only. */
export function HistoryNotice({ windowHours, requestedHours, coverageHours }: HistoryNoticeProps) {
  const { t } = useTranslation();
  const parts = [t('history.available', { hours: windowHours })];
  if (requestedHours !== undefined && requestedHours > windowHours) {
    parts.push(t('history.requested', { period: period(requestedHours) }));
  }
  if (coverageHours !== undefined && coverageHours < windowHours) parts.push(t('history.partial', { hours: coverageHours }));
  return (
    <p role="note" className="m-0 text-[0.78rem] text-muted">
      {parts.join(' · ')}
    </p>
  );
}
