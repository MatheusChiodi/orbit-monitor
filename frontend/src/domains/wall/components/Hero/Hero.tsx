import { deviationLabel, formatReading, ruleText } from '@/domains/monitor/rules';
import { statusLabel } from '@/domains/monitor/status';
import { formatDuration, formatElapsed } from '@/shared/format';
import { Badge, Panel, TEXT_CLASS, ThresholdChart } from '@/shared/ui';
import type { HeroSelection } from '../../selectors';
import { AcknowledgeButton } from '../AcknowledgeButton';

export interface HeroProps {
  selection: HeroSelection;
  now: Date;
  onAcknowledge: (incidentId: string) => void;
}

/** Herói: identificação; nome + valor + regra + desvio; gráfico; impacto e reconhecimento. */
export function Hero({ selection, now, onAcknowledge }: HeroProps) {
  const { monitor, incident, group } = selection;
  const status = monitor.status;
  const unowned = Boolean(incident && !incident.acknowledgedBy);
  const deviation = monitor.rule && monitor.value !== null ? deviationLabel(monitor.value, monitor.rule) : null;
  const escalatesIn =
    incident?.escalatesAt && unowned ? Date.parse(incident.escalatesAt) - now.getTime() : null;

  return (
    <Panel title="Situação" tone={status} pulse={status === 'DOWN' && unowned} live className="h-full pl-[1.25rem]">
      <div className="flex items-center gap-[0.6rem] text-[0.85rem] text-muted">
        <span className={`font-semibold ${TEXT_CLASS[status]}`}>{statusLabel(status)}</span>
        <span aria-hidden>·</span>
        {group && <span>{group.name}</span>}
        {group && <span aria-hidden>·</span>}
        <span>{monitor.type}</span>
        <span className="ml-auto font-mono text-[1.15rem] text-text">
          {formatElapsed(incident?.openedAt ?? monitor.since, now)}
        </span>
      </div>

      <h3 className="mt-[0.35rem] mb-0 font-display text-[2.4rem] leading-tight font-bold tracking-tight">
        {monitor.name}
      </h3>

      <div className="mt-[0.35rem] flex flex-wrap items-baseline gap-x-[0.9rem] gap-y-[0.3rem]">
        <span className={`font-mono text-[1.5rem] font-semibold ${TEXT_CLASS[status]}`}>
          {formatReading(monitor.value, monitor.unit)}
        </span>
        {monitor.rule && <span className="font-mono text-[0.85rem] text-muted">{`regra ${ruleText(monitor.rule)}`}</span>}
        {deviation && (
          <Badge tone={status} mono>
            {deviation}
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
            <span className="text-[0.78rem] text-muted">Impacto provável</span>
            {incident.impact.map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
        )}
        <div className="ml-auto flex w-full flex-col items-stretch gap-[0.5rem] sm:w-auto sm:flex-row sm:items-center sm:gap-[0.8rem]">
          {escalatesIn !== null && escalatesIn > 0 && (
            <span className="font-mono text-[0.85rem] text-warn-text">{`escalona em ${formatDuration(escalatesIn)}`}</span>
          )}
          {incident && <AcknowledgeButton incident={incident} onAcknowledge={onAcknowledge} className="w-full sm:w-auto" />}
        </div>
      </footer>
    </Panel>
  );
}
