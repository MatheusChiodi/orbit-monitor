import { formatPercent, formatRelative } from '@/shared/format';
import { Panel } from '@/shared/ui';

export interface HeroCalmProps {
  uptime24h: number;
  lastRecoveryAt: string | null;
  nearLimitCount: number;
  now: Date;
}

/** Herói quando não há problema: círculo verde com ondas lentas. */
export function HeroCalm({ uptime24h, lastRecoveryAt, nearLimitCount, now }: HeroCalmProps) {
  return (
    <Panel title="Situação" tone="OK" live className="h-full pl-[1.25rem]">
      <div className="flex flex-1 flex-col items-center justify-center gap-[1.2rem] py-[1.5rem] text-center">
        <span aria-hidden className="relative inline-flex size-[4.5rem] items-center justify-center">
          <span className="anim-ring absolute inset-0 rounded-full border-2 border-ok/60" />
          <span className="anim-ring absolute inset-0 rounded-full border-2 border-ok/60 [animation-delay:1.3s]" />
          <span className="size-[2.6rem] rounded-full bg-ok/90" />
        </span>
        <h3 className="m-0 font-display text-[2.4rem] font-bold tracking-tight">Tudo operacional</h3>
        <dl className="m-0 grid grid-cols-1 gap-[0.8rem] sm:grid-cols-3">
          <div>
            <dt className="section-label">Disponibilidade 24 h</dt>
            <dd className="m-0 font-mono text-[1.5rem] text-ok-text">{formatPercent(uptime24h, 2)}</dd>
          </div>
          <div>
            <dt className="section-label">Última recuperação</dt>
            <dd className="m-0 font-mono text-[1.5rem]">{lastRecoveryAt ? formatRelative(lastRecoveryAt, now) : 'nenhuma'}</dd>
          </div>
          <div>
            <dt className="section-label">Perto do limite</dt>
            <dd className="m-0 font-mono text-[1.5rem]">{`${nearLimitCount} ${nearLimitCount === 1 ? 'monitor' : 'monitores'}`}</dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
}
