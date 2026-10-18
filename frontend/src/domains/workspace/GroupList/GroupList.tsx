import { useId, useState } from 'react';
import { formatReading, ruleText } from '@/domains/monitor/rules';
import { groupSummary, sortExceptionsFirst, statusLabel } from '@/domains/monitor/status';
import type { Group, MonitorView } from '@/shared/api/types';
import { Button, StatusDot, TEXT_CLASS } from '@/shared/ui';

export interface GroupListProps {
  groups: readonly Group[];
  monitors: readonly MonitorView[];
  onNewMonitor: () => void;
  canEdit?: boolean;
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function GroupSection({ group, monitors }: { group: Group; monitors: MonitorView[] }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="rounded-[0.9rem] border border-line bg-s1">
      <header className="flex items-center justify-between border-b border-line px-[0.9rem] py-[0.6rem]">
        <h2 id={titleId} className="m-0 text-[1rem] font-semibold">
          {group.name}
        </h2>
        <span className="font-mono text-[0.8rem] text-muted">{groupSummary(monitors)}</span>
      </header>
      <table className="w-full border-collapse text-[0.9rem]">
        <thead className="sr-only">
          <tr>
            <th>Estado</th>
            <th>Monitor</th>
            <th>Tipo</th>
            <th>Regra</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {sortExceptionsFirst(monitors).map((m) => (
            <tr key={m.id} className="border-b border-line last:border-0">
              <td className="w-[7rem] px-[0.9rem] py-[0.5rem]">
                <span className="inline-flex items-center gap-[0.4rem]">
                  <StatusDot status={m.status} />
                  <span className={`text-[0.75rem] font-semibold ${TEXT_CLASS[m.status]}`}>{statusLabel(m.status)}</span>
                </span>
              </td>
              <td className="py-[0.5rem] font-medium">{m.name}</td>
              <td className="py-[0.5rem] font-mono text-[0.8rem] text-muted">{m.type}</td>
              <td className="py-[0.5rem] font-mono text-[0.8rem] text-muted">{m.rule ? ruleText(m.rule) : '—'}</td>
              <td className="px-[0.9rem] py-[0.5rem] text-right font-mono">{formatReading(m.value, m.unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Lista de grupos e monitores do console, com filtro por texto. */
export function GroupList({ groups, monitors, onNewMonitor, canEdit = true }: GroupListProps) {
  const [query, setQuery] = useState('');
  const needle = normalize(query.trim());
  const visible = needle ? monitors.filter((m) => normalize(m.name).includes(needle)) : monitors;
  const sections = groups
    .map((group) => ({ group, monitors: visible.filter((m) => m.groupId === group.id) }))
    .filter((s) => s.monitors.length > 0);

  return (
    <div className="flex flex-col gap-[1rem]">
      <div className="flex flex-wrap items-center gap-[0.8rem]">
        <input
          type="search"
          aria-label="Filtrar monitores"
          placeholder="Filtrar monitores"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-[2.2rem] min-w-[14rem] flex-1 rounded-[0.45rem] border border-line-2 bg-s2 px-[0.7rem] text-text placeholder:text-dim focus:border-info focus:outline-none"
        />
        {canEdit && (
          <Button variant="primary" onClick={onNewMonitor}>
            Novo monitor
          </Button>
        )}
      </div>
      {sections.length === 0 ? (
        <p className="text-muted">Nenhum monitor encontrado</p>
      ) : (
        sections.map((s) => <GroupSection key={s.group.id} group={s.group} monitors={s.monitors} />)
      )}
    </div>
  );
}
