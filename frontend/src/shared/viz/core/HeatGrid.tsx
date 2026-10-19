import { safeText } from '@/shared/privacy';
import { sequentialOpacity } from './palette';
import { markTransition } from './useVizLevel';
import type { AnimationLevel } from '@/shared/motion';

export interface HeatCell {
  key: string;
  /** Accessible name: when + value (or "no data"). */
  name: string;
  value: number | null;
}

export interface HeatRow {
  key: string;
  label: string;
  cells: HeatCell[];
}

export interface HeatGridProps {
  label: string;
  rows: HeatRow[];
  level: AnimationLevel;
  /** Optional column captions (decorative; each cell carries its full name). */
  columns?: { index: number; text: string }[];
  columnCount: number;
}

/**
 * Sequential heatmap as an ARIA grid: one hue, light → strong by magnitude; missing cells are hatched,
 * never drawn as zero.
 */
export function HeatGrid({ label, rows, level, columns = [], columnCount }: HeatGridProps) {
  const max = Math.max(0, ...rows.flatMap((r) => r.cells.map((c) => c.value ?? 0)));
  return (
    <div className="flex flex-col gap-[0.2rem]">
      <div role="grid" aria-label={safeText(label)} aria-readonly="true" className="flex flex-col gap-[2px]">
        {rows.map((row) => (
          <div key={row.key} role="row" className="grid items-center gap-[2px]" style={{ gridTemplateColumns: `2.2rem repeat(${columnCount}, minmax(0, 1fr))` }}>
            <span aria-hidden className="truncate text-[0.62rem] text-dim">
              {row.label}
            </span>
            {row.cells.map((cell) => (
              <span
                key={cell.key}
                role="gridcell"
                aria-label={cell.name}
                title={cell.name}
                data-empty={cell.value === null ? 'true' : undefined}
                className={`block aspect-square min-h-[0.5rem] rounded-[2px] ${markTransition(level)} ${cell.value === null ? 'bg-[repeating-linear-gradient(45deg,var(--s3)_0_2px,transparent_2px_4px)]' : 'bg-info'}`}
                style={cell.value === null ? undefined : { opacity: sequentialOpacity(cell.value, max) }}
              />
            ))}
          </div>
        ))}
      </div>
      {columns.length > 0 && (
        <div aria-hidden className="grid gap-[2px] font-mono text-[0.62rem] text-dim" style={{ gridTemplateColumns: `2.2rem repeat(${columnCount}, minmax(0, 1fr))` }}>
          <span />
          {Array.from({ length: columnCount }, (_, i) => (
            <span key={i}>{columns.find((c) => c.index === i)?.text ?? ''}</span>
          ))}
        </div>
      )}
    </div>
  );
}
