import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { deviationLabel, formatReading, ruleText } from '@/domains/monitor/rules';
import { EscalationCountdown } from '@/domains/alerting/EscalationCountdown';
import { formatElapsed } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { translate } from '@/shared/i18n/message';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Badge } from '@/shared/ui/Badge';
import { FlashValue } from '@/shared/ui/FlashValue';
import { Panel } from '@/shared/ui/Panel';
import { TEXT_CLASS } from '@/shared/ui/tones';
import type { HeroSelection } from '../../selectors';
import { AcknowledgeButton } from '../AcknowledgeButton';

/** The chart code loads right after first paint; the hero text (state, value, rule) never waits for it. */
const ThresholdChart = lazy(() => import('@/shared/ui/ThresholdChart/ThresholdChart').then((mod) => ({ default: mod.ThresholdChart })));

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
      className={`h-full pl-5 ${status === 'DOWN' ? 'fx-down-glow' : ''}`}
    >
      <div className="flex items-center gap-2 text-base text-muted">
        <span className={`font-semibold ${TEXT_CLASS[status]}`}>{t(`status.label.${status}`)}</span>
        <span aria-hidden>·</span>
        {group && <SafeValue value={group.name} surface="wall" />}
        {group && <span aria-hidden>·</span>}
        <span>{monitor.type}</span>
        <span className="ml-auto font-mono text-lg text-text">
          {formatElapsed(incident?.openedAt ?? monitor.since, now, locale)}
        </span>
      </div>

      <h3 className="display-wide mt-1 mb-0 text-2xl">
        <SafeValue value={monitor.name} surface="wall" />
      </h3>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <FlashValue value={monitor.value} className={`display-wide tabular text-xl ${TEXT_CLASS[status]}`}>
          {formatReading(monitor.value, monitor.unit, locale)}
        </FlashValue>
        {monitor.rule && (
          <span className="font-mono text-base text-muted">{t('rule.text', { rule: ruleText(monitor.rule, locale) })}</span>
        )}
        {deviation && (
          <Badge tone={status} mono>
            {translate(t, deviation)}
          </Badge>
        )}
      </div>

      <Suspense fallback={<div aria-hidden className="wall-chart mt-3 flex-1" />}>
        <ThresholdChart
          series={monitor.series ?? []}
          rule={monitor.rule}
          status={status}
          className="wall-chart mt-3 flex-1"
        />
      </Suspense>

      <footer className="mt-3 flex flex-wrap items-center gap-2">
        {incident && incident.impact.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">{t('wall.hero.impact')}</span>
            {incident.impact.map((item) => (
              <Badge key={item}>
                <SafeValue value={item} surface="wall" />
              </Badge>
            ))}
          </div>
        )}
        <div className="ml-auto flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
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
