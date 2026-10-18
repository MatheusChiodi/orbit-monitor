import { useEffect } from 'react';
import { globalPhrase, statusFromCounts, tabTitle, type StatusCounts } from '@/domains/monitor/status';
import type { WallConnectionState } from '../../store';
import { formatClock, formatRelative } from '@/shared/format';
import { Button, StatusPill } from '@/shared/ui';

export interface WallHeaderProps {
  environment: string;
  counts: StatusCounts;
  now: Date;
  updatedAt: string | null;
  connection: WallConnectionState;
  onFullscreen?: () => void;
}

const CONNECTION_NOTE: Partial<Record<WallConnectionState, string>> = {
  mock: 'dados de demonstração',
  closed: 'reconectando',
  connecting: 'conectando',
};

/** Marca provisória: anel em gradiente azul→verde com núcleo escuro (03-design.md, seção 8). */
function BrandMark() {
  return (
    <span
      aria-hidden
      className="inline-block size-[1.3rem] rounded-full p-[0.22rem]"
      style={{ background: 'conic-gradient(from 200deg, var(--info), var(--ok), var(--info))' }}
    >
      <span className="block size-full rounded-full bg-bg" />
    </span>
  );
}

export function WallHeader({ environment, counts, now, updatedAt, connection, onFullscreen }: WallHeaderProps) {
  const title = tabTitle(counts);
  useEffect(() => {
    document.title = title;
  }, [title]);

  const note = CONNECTION_NOTE[connection];

  return (
    <header className="flex min-h-[3.2rem] flex-wrap items-center gap-x-[1.2rem] gap-y-[0.4rem] border-b border-line px-[1rem] py-[0.4rem]">
      <div className="flex items-center gap-[0.55rem]">
        <BrandMark />
        <span className="font-display text-[1.1rem] font-bold tracking-tight">Orbit</span>
        <span className="rounded-[0.4rem] border border-line-2 px-[0.45rem] py-[0.05rem] text-[0.78rem] text-muted">
          {environment}
        </span>
      </div>

      <div role="status" aria-live="polite">
        <StatusPill status={statusFromCounts(counts)}>{globalPhrase(counts)}</StatusPill>
      </div>

      <ul className="m-0 flex list-none gap-[0.9rem] p-0 font-mono text-[0.85rem]" aria-label="Contagem por estado">
        <li className="text-down-text">{`${counts.down} fora`}</li>
        <li className="text-warn-text">{`${counts.warn} atenção`}</li>
        <li className="text-ok-text">{`${counts.ok} ok`}</li>
      </ul>

      <div className="ml-auto flex items-center gap-[0.9rem]">
        {note && <span className="text-[0.78rem] text-warn-text">{note}</span>}
        {updatedAt && (
          <span className="text-[0.78rem] text-muted">{`atualizado ${formatRelative(updatedAt, now)}`}</span>
        )}
        <time dateTime={now.toISOString()} className="font-mono text-[1.15rem] font-medium">
          {formatClock(now)}
        </time>
        {onFullscreen && (
          <Button variant="ghost" onClick={onFullscreen} aria-label="Tela cheia">
            ⛶
          </Button>
        )}
      </div>
    </header>
  );
}
