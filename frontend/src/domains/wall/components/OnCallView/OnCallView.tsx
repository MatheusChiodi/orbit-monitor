import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { formatReading, ruleText } from '@/domains/monitor/rules';
import type { WallSnapshot } from '@/shared/api/types';
import { formatElapsed } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { AnimatedItem, FlashValue, Panel, StatusDot, TEXT_CLASS } from '@/shared/ui';
import { alsoActive, pickHero } from '../../selectors';
import { AcknowledgeButton } from '../AcknowledgeButton';

export interface OnCallViewProps {
  snapshot: WallSnapshot;
  now: Date;
  onAcknowledge: (incidentId: string) => void;
}

/**
 * FE-49: phone view for whoever is on call — the worst problem with a full-width Acknowledge
 * (≥ 2.75 rem touch target) and the other active problems; no matrix or timeline.
 */
export function OnCallView({ snapshot, now, onAcknowledge }: OnCallViewProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const hero = pickHero(snapshot);
  // Active incidents, worst first (same order as the wall).
  const order = new Map(alsoActive(snapshot, null).map((m, i) => [m.id, i]));
  const active = snapshot.incidents
    .map((incident) => snapshot.monitors.find((m) => m.id === incident.monitorId))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));

  if (!hero) {
    return (
      <main className="flex flex-col gap-[0.8rem] p-[1rem]">
        <Panel tone="OK" live className="pl-[1.25rem]">
          <h1 className="m-0 font-display text-[1.6rem] font-bold tracking-tight">{t('status.phrase.ok')}</h1>
          <p className="m-0 text-[0.85rem] text-muted">{t('onCall.none')}</p>
        </Panel>
      </main>
    );
  }

  const { monitor, incident } = hero;
  return (
    <main className="flex flex-col gap-[0.8rem] p-[1rem]">
      <Panel tone={monitor.status} pulse={monitor.status === 'DOWN' && !incident?.acknowledgedBy} live className="pl-[1.25rem]">
        <span className={`text-[0.85rem] font-semibold ${TEXT_CLASS[monitor.status]}`}>{t(`status.label.${monitor.status}`)}</span>
        <h1 className="m-0 font-display text-[1.6rem] leading-tight font-bold tracking-tight">
          <SafeValue value={monitor.name} surface="wall" />
        </h1>
        <p className="m-0 flex flex-wrap items-baseline gap-x-[0.6rem]">
          <FlashValue value={monitor.value} className={`font-mono text-[1.25rem] font-semibold ${TEXT_CLASS[monitor.status]}`}>
            {formatReading(monitor.value, monitor.unit, locale)}
          </FlashValue>
          {monitor.rule && (
            <span className="font-mono text-[0.8rem] text-muted">{t('rule.text', { rule: ruleText(monitor.rule, locale) })}</span>
          )}
        </p>
        <p className="m-0 font-mono text-[0.85rem] text-muted">{formatElapsed(incident?.openedAt ?? monitor.since, now, locale)}</p>
        {incident && (
          <AcknowledgeButton
            incident={incident}
            onAcknowledge={onAcknowledge}
            className="mt-[0.6rem] w-full"
            buttonClassName="min-h-[2.75rem]"
          />
        )}
      </Panel>

      <Panel title={t('onCall.active')}>
        <ul className="m-0 flex list-none flex-col gap-[0.45rem] p-0">
          <AnimatePresence>
            {active.map((m, index, all) => (
              <AnimatedItem key={m.id} index={index} count={all.length} className="flex items-center gap-[0.55rem]">
                <StatusDot status={m.status} />
                <SafeValue value={m.name} surface="wall" className="min-w-0 flex-1 truncate text-[0.9rem]" />
                <span className="font-mono text-[0.8rem] text-muted">{formatReading(m.value, m.unit, locale)}</span>
              </AnimatedItem>
            ))}
          </AnimatePresence>
        </ul>
      </Panel>
    </main>
  );
}
