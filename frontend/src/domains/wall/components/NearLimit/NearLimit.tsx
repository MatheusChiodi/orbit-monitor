import { formatReading, ruleText } from '@/domains/monitor/rules';
import type { NearLimitItem } from '@/domains/monitor/status';
import { Panel } from '@/shared/ui';

export interface NearLimitProps {
  items: readonly NearLimitItem[];
}

/** Abaixo de 25% de folga a barra fica âmbar. */
const LOW_HEADROOM = 0.25;

export function NearLimit({ items }: NearLimitProps) {
  return (
    <Panel title="Perto do limite">
      {items.length === 0 ? (
        <p className="m-0 text-[0.85rem] text-muted">Nenhum monitor com regra numérica</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-[0.6rem] p-0">
          {items.map(({ monitor, headroom }) => {
            const pct = Math.max(0, Math.min(100, Math.round(headroom * 100)));
            const tone = headroom < LOW_HEADROOM ? 'WARN' : 'OK';
            return (
              <li key={monitor.id} className="grid grid-cols-[1fr_auto] items-center gap-x-[0.8rem] gap-y-[0.2rem]">
                <span className="truncate text-[0.88rem] font-semibold">{monitor.name}</span>
                <span
                  className={`row-span-2 font-mono text-[1.25rem] ${tone === 'WARN' ? 'text-warn-text' : 'text-ok-text'}`}
                >
                  {`${pct}%`}
                </span>
                <span className="flex flex-col gap-[0.25rem]">
                  <span
                    role="meter"
                    aria-label={`Folga de ${monitor.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    className="block h-[0.35rem] overflow-hidden rounded-full bg-s3"
                  >
                    <span
                      data-fill={tone}
                      className={`block h-full rounded-full ${tone === 'WARN' ? 'bg-warn' : 'bg-ok'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="font-mono text-[0.72rem] text-muted">
                    {`${formatReading(monitor.value, monitor.unit)} · regra ${monitor.rule ? ruleText(monitor.rule) : ''}`}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
