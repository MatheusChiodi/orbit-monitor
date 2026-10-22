import { useTranslation } from 'react-i18next';
import { deviationLabel, formatReading, ruleText } from '@/domains/monitor/rules';
import { EscalationCountdown } from '@/domains/alerting/EscalationCountdown';
import { formatElapsed } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { translate } from '@/shared/i18n/message';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Badge, FlashValue, Panel, TEXT_CLASS, ThresholdChart } from '@/shared/ui';
import type { HeroSelection } from '../../selectors';
import { AcknowledgeButton } from '../AcknowledgeButton';

export interface HeroProps {
  selection: HeroSelection;
  now: Date;
  onAcknowledge: (incidentId: string) => void;
  /** FE-40: name of the next escalation step (BE-27), shown next to the countdown. */
  nextStep?: string | null;
}

/** Hero: identification; name + value + rule + deviation; chart; impact and acknowledgement. */
export function Hero({ selection, now, onAcknowledge, nextStep = null }: HeroProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const { monitor, incident, group } = selection;
  const status = monitor.status;
  const unowned = Boolean(incident && !incident.acknowledgedBy);
  const deviation = monitor.rule && monitor.value !== null ? deviationLabel(monitor.value, monitor.rule, locale) : null;

  return (
    <Panel
      title={t('wall.hero.title')}
      tone={status}
      pulse={status === 'DOWN' && unowned}
      live
      className={`h-full pl-[1.25rem] ${status === 'DOWN' ? 'fx-down-glow' : ''}`}
    >
      <div className="flex items-center gap-[0.6rem] text-[0.85rem] text-muted">
        <span className={`font-semibold ${TEXT_CLASS[status]}`}>{t(`status.label.${status}`)}</span>
        <span aria-hidden>·</span>
        {group && <SafeValue value={group.name} surface="wall" />}
        {group && <span aria-hidden>·</span>}
        <span>{monitor.type}</span>
        <span className="ml-auto font-mono text-[1.15rem] text-text">
          {formatElapsed(incident?.openedAt ?? monitor.since, now, locale)}
        </span>
      </div>

      <h3 className="mt-[0.35rem] mb-0 font-display text-[2.4rem] leading-tight font-bold tracking-tight">
        <SafeValue value={monitor.name} surface="wall" />
      </h3>

      <div className="mt-[0.35rem] flex flex-wrap items-baseline gap-x-[0.9rem] gap-y-[0.3rem]">
        <FlashValue value={monitor.value} className={`font-mono text-[1.5rem] font-semibold ${TEXT_CLASS[status]}`}>
          {formatReading(monitor.value, monitor.unit, locale)}
        </FlashValue>
        {monitor.rule && (
          <span className="font-mono text-[0.85rem] text-muted">{t('rule.text', { rule: ruleText(monitor.rule, locale) })}</span>
        )}
        {deviation && (
          <Badge tone={status} mono>
            {translate(t, deviation)}
          </Badge>
        )}
      </div>

      <ThresholdChart
        series={monitor.series ?? []}
        rule={monitor.rule}
        status={status}
        className="wall-chart mt-[0.7rem] flex-1"
      />

      <footer className="mt-[0.7rem] flex flex-wrap items-center gap-[0.6rem]">
        {incident && incident.impact.length > 0 && (
          <div className="flex flex-wrap items-center gap-[0.4rem]">
            <span className="text-[0.78rem] text-muted">{t('wall.hero.impact')}</span>
            {incident.impact.map((item) => (
              <Badge key={item}>
                <SafeValue value={item} surface="wall" />
              </Badge>
            ))}
          </div>
        )}
        <div className="ml-auto flex w-full flex-col items-stretch gap-[0.5rem] sm:w-auto sm:flex-row sm:items-center sm:gap-[0.8rem]">
          {incident && (
            <EscalationCountdown
              escalatesAt={incident.escalatesAt}
              nextStep={nextStep}
              now={now}
              acknowledged={Boolean(incident.acknowledgedBy)}
            />
          )}
          {incident && <AcknowledgeButton incident={incident} onAcknowledge={onAcknowledge} className="w-full sm:w-auto" />}
        </div>
      </footer>
    </Panel>
  );
}
