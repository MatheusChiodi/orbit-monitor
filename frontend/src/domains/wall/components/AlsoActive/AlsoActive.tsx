import { formatReading } from '@/domains/monitor/rules';
import { statusLabel } from '@/domains/monitor/status';
import type { Group, MonitorView } from '@/shared/api/types';
import { formatElapsed } from '@/shared/format';
import { Panel, StatusDot, TEXT_CLASS } from '@/shared/ui';

export interface AlsoActiveProps {
  monitors: readonly MonitorView[];
  groups: readonly Group[];
  now: Date;
}

/** Lista curta dos demais problemas, abaixo do herói. */
export function AlsoActive({ monitors, groups, now }: AlsoActiveProps) {
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  return (
    <Panel title="Também ativos">
      {monitors.length === 0 ? (
        <p className="m-0 text-[0.85rem] text-muted">Nenhum outro problema ativo</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-[0.45rem] p-0">
          {monitors.slice(0, 5).map((m) => (
            <li key={m.id} className="flex items-center gap-[0.55rem] rounded-[0.45rem] bg-s2 px-[0.6rem] py-[0.45rem]">
              <StatusDot status={m.status} />
              <span className={`text-[0.68rem] font-semibold ${TEXT_CLASS[m.status]}`}>{statusLabel(m.status)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.88rem] font-semibold">{m.name}</span>
                <span className="block truncate text-[0.72rem] text-muted">{groupName.get(m.groupId)}</span>
              </span>
              <span className="text-right">
                <span className="block font-mono text-[0.85rem]">{formatReading(m.value, m.unit)}</span>
                <span className="block font-mono text-[0.68rem] text-dim">{formatElapsed(m.since, now)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
