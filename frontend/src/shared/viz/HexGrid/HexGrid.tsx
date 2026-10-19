import { useTranslation } from 'react-i18next';
import type { Status } from '@/shared/api/types';
import { SafeValue, safeText } from '@/shared/privacy';
import { STATUS_COLOR } from '../core/palette';
import { VizFrame } from '../core/VizFrame';
import { markTransition, useVizLevel } from '../core/useVizLevel';
import { toStatus, type ModeProps } from '../types';

const ORDER: Record<Status, number> = { DOWN: 0, WARN: 1, OK: 2 };
const HEX = 'polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%)';

/** Mode 20: hex grid, many monitors at a glance; problems first, every cell named "monitor: state". */
export function HexGrid({ data, animation, className }: ModeProps) {
  const { t } = useTranslation();
  const level = useVizLevel(animation);
  const monitors = (data.monitors ?? [])
    .map((m, index) => ({ ...m, state: toStatus(m.status), index }))
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.index - b.index);
  const counts = { down: 0, warn: 0, ok: 0 };
  for (const m of monitors) counts[m.state === 'DOWN' ? 'down' : m.state === 'WARN' ? 'warn' : 'ok'] += 1;
  return (
    <VizFrame mode="hex-grid" level={level} label={data.label} status={data.status} empty={monitors.length === 0} className={className}>
      <p className="m-0 flex flex-wrap gap-[0.8rem] font-mono text-[0.75rem] text-muted tabular-nums">
        {counts.down > 0 && <span className="text-down-text">{t('status.counter.down', { count: counts.down })}</span>}
        {counts.warn > 0 && <span className="text-warn-text">{t('status.counter.warn', { count: counts.warn })}</span>}
        {counts.ok > 0 && <span>{t('status.counter.ok', { count: counts.ok })}</span>}
      </p>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(3.4rem,1fr))] gap-[0.35rem] p-0">
        {monitors.map((m) => (
          <li key={m.id} className="flex min-w-0 flex-col items-center gap-[0.2rem]">
            <span
              role="img"
              aria-label={t('viz.hex.cell', { name: safeText(m.name), status: t(`status.label.${m.state}`) })}
              data-status={m.state}
              className={`block aspect-[1.15] w-[2.4rem] ${markTransition(level)}`}
              style={{ clipPath: HEX, background: STATUS_COLOR[m.state] }}
            />
            <SafeValue value={m.name} className="w-full truncate text-center text-[0.62rem] text-muted" />
          </li>
        ))}
      </ul>
    </VizFrame>
  );
}
