import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatRelative } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { useConsole } from '../../ConsoleContext';

const LIMIT = 20;

/** Latest events of one monitor from the history event log (`GET /api/events?monitorId`), newest first. */
export function MonitorEvents({ monitorId }: { monitorId: string }) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const { source, demo } = useConsole();
  const events = useQuery({
    queryKey: ['events', demo, monitorId],
    queryFn: () => source.listEvents({ monitorId, limit: LIMIT }),
  });
  const items = [...(events.data ?? [])].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, LIMIT);
  const now = new Date();

  return (
    <section data-surface="panel" aria-labelledby="monitor-events" className="flex flex-col gap-2 rounded-md border border-line bg-s1 p-4">
      <h2 id="monitor-events" className="section-label m-0">
        {t('ops.detail.events.title')}
      </h2>
      {events.isError ? (
        <p className="m-0 text-base text-muted">{t('ops.detail.events.unavailable')}</p>
      ) : items.length === 0 ? (
        <p className="m-0 text-base text-muted">{events.isPending ? t('app.loading') : t('ops.detail.events.empty')}</p>
      ) : (
        <ol aria-label={t('ops.detail.events.title')} className="m-0 flex list-none flex-col divide-y divide-line p-0 text-sm">
          {items.map((event, index) => (
            <li key={`${event.at}-${index}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
              <time dateTime={event.at} className="w-24 shrink-0 font-mono text-xs text-dim">
                {formatRelative(event.at, now, locale)}
              </time>
              <span className="font-medium">{t(`ops.detail.events.types.${event.type.replaceAll('.', '_')}`, { defaultValue: event.type })}</span>
              {event.detail && <SafeValue value={event.detail} className="min-w-0 text-muted" />}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
