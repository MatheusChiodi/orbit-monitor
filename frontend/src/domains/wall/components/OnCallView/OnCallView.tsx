import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { formatReading, ruleText } from '@/domains/monitor/rules';
import type { WallSnapshot } from '@/shared/api/types';
import { formatElapsed } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { AnimatedItem } from '@/shared/ui/AnimatedItem';
import { FlashValue } from '@/shared/ui/FlashValue';
import { Panel } from '@/shared/ui/Panel';
import { StatusDot } from '@/shared/ui/StatusPill';
import { TEXT_CLASS } from '@/shared/ui/tones';
import { alsoActive, pickHero } from '../../selectors';
import { AcknowledgeButton } from '../AcknowledgeButton';
import { WallEmpty } from '../WallEmpty';

export interface OnCallViewProps {
  snapshot: WallSnapshot;
  now: Date;
  onAcknowledge: (incidentId: string) => void;
  /** Console address shown on an empty install; defaults to this server. */
  consoleUrl?: string;
}

/**
 * FE-49: phone view for whoever is on call — the worst problem with a full-width Acknowledge
 * (≥ 2.75 rem touch target) and the other active problems; no matrix or timeline.
 */
export function OnCallView({ snapshot, now, onAcknowledge, consoleUrl = `${window.location.origin}/` }: OnCallViewProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const hero = pickHero(snapshot);
  // Active incidents, worst first (same order as the wall).
  const order = new Map(alsoActive(snapshot, null).map((m, i) => [m.id, i]));
  const active = snapshot.incidents
    .map((incident) => snapshot.monitors.find((m) => m.id === incident.monitorId))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));

  // Fresh install: nothing watched yet, so nothing to call "operational".
  if (snapshot.monitors.length === 0) return <WallEmpty consoleUrl={consoleUrl} />;

  if (!hero) {
    return (
      <main className="flex flex-col gap-3 p-4">
        <Panel tone="OK" live className="pl-5">
          <h1 className="display-wide m-0 text-xl">{t('status.phrase.ok')}</h1>
          <p className="m-0 text-base text-muted">{t('onCall.none')}</p>
        </Panel>
      </main>
    );
  }

  const { monitor, incident } = hero;
  return (
    <main className="flex flex-col gap-3 p-4">
      <Panel tone={monitor.status} pulse={monitor.status === 'DOWN' && !incident?.acknowledgedBy} live className="pl-5">
        <span className={`text-base font-semibold ${TEXT_CLASS[monitor.status]}`}>{t(`status.label.${monitor.status}`)}</span>
        <h1 className="display-wide m-0 text-xl">
          <SafeValue value={monitor.name} surface="wall" />
        </h1>
        <p className="m-0 flex flex-wrap items-baseline gap-x-2">
          <FlashValue value={monitor.value} className={`display-wide tabular text-lg ${TEXT_CLASS[monitor.status]}`}>
            {formatReading(monitor.value, monitor.unit, locale)}
          </FlashValue>
          {monitor.rule && (
            <span className="font-mono text-sm text-muted">{t('rule.text', { rule: ruleText(monitor.rule, locale) })}</span>
          )}
        </p>
        <p className="m-0 font-mono text-base text-muted">{formatElapsed(incident?.openedAt ?? monitor.since, now, locale)}</p>
        {incident && (
          <AcknowledgeButton
            incident={incident}
            onAcknowledge={onAcknowledge}
            className="mt-2 w-full"
            buttonClassName="min-h-11"
          />
        )}
      </Panel>

      <Panel title={t('onCall.active')}>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          <AnimatePresence>
            {active.map((m, index, all) => (
              <AnimatedItem key={m.id} index={index} count={all.length} className="flex items-center gap-2">
                <StatusDot status={m.status} />
                <SafeValue value={m.name} surface="wall" className="min-w-0 flex-1 truncate text-base" />
                <span className="font-mono text-sm text-muted">{formatReading(m.value, m.unit, locale)}</span>
              </AnimatedItem>
            ))}
          </AnimatePresence>
        </ul>
      </Panel>
    </main>
  );
}
