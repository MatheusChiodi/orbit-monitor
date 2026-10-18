import type { TimelineEvent, TimelineKind } from '@/shared/api/types';
import { formatClock } from '@/shared/format';
import { Panel } from '@/shared/ui';

export interface TimelineProps {
  events: readonly TimelineEvent[];
  freshIds: ReadonlySet<string>;
}

/** Reconhecimentos entram em azul (informativo), não em verde. */
const DOT: Record<TimelineKind, string> = {
  DOWN: 'bg-down',
  WARN: 'bg-warn',
  OK: 'bg-ok',
  ACK: 'bg-info',
  INFO: 'bg-muted',
};

const KIND_LABEL: Record<TimelineKind, string> = {
  DOWN: 'fora',
  WARN: 'atenção',
  OK: 'recuperado',
  ACK: 'reconhecido',
  INFO: 'informativo',
};

export function Timeline({ events, freshIds }: TimelineProps) {
  return (
    <Panel title="Linha do tempo" className="h-full">
      {events.length === 0 ? (
        <p className="m-0 text-[0.85rem] text-muted">Sem eventos recentes</p>
      ) : (
        <ol className="m-0 flex min-h-0 list-none flex-col gap-[0.2rem] overflow-hidden p-0">
          {events.map((event) => (
            <li
              key={event.id}
              data-kind={event.kind}
              className={`grid grid-cols-[auto_auto_1fr] items-start gap-x-[0.6rem] rounded-[0.4rem] px-[0.4rem] py-[0.35rem] ${freshIds.has(event.id) ? 'anim-flash' : ''}`}
            >
              <time dateTime={event.at} className="font-mono text-[0.78rem] text-muted">
                {formatClock(event.at)}
              </time>
              <span
                data-dot
                role="img"
                aria-label={KIND_LABEL[event.kind]}
                className={`mt-[0.32rem] size-[0.5rem] rounded-full ${DOT[event.kind]}`}
              />
              <span className="min-w-0">
                <span className="block text-[0.85rem] font-semibold">{event.title}</span>
                {event.detail && <span className="block font-mono text-[0.72rem] text-muted">{event.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
