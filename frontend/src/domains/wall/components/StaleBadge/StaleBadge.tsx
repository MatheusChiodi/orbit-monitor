import { useTranslation } from 'react-i18next';
import { formatDuration, formatElapsed } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { STALE_AFTER_MS, isStale } from './staleness';

export interface StaleBadgeProps {
  updatedAt: string | null;
  now: Date;
  staleAfterMs?: number;
}

/** Data age badge; once stale it is announced and the wall is marked `data-stale` (greyed out by CSS). */
export function StaleBadge({ updatedAt, now, staleAfterMs = STALE_AFTER_MS }: StaleBadgeProps) {
  const { t, i18n } = useTranslation();
  const stale = isStale(updatedAt, now, staleAfterMs);
  let text: string;
  if (!updatedAt) text = t('stale.never');
  else if (stale) text = t('stale.stale', { ago: formatElapsed(updatedAt, now, currentLocale(i18n)) });
  else text = t('stale.age', { age: formatDuration(now.getTime() - Date.parse(updatedAt)) });
  return (
    <span data-stale={stale ? 'true' : 'false'} className="inline-flex">
      <span
        role={stale ? 'status' : undefined}
        aria-live={stale ? 'polite' : undefined}
        className={`text-[0.78rem] ${stale ? 'font-semibold text-warn-text' : 'text-muted'}`}
      >
        {text}
      </span>
    </span>
  );
}
