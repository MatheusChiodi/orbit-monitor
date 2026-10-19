import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '@/shared/format';
import { HistoryNotice } from '@/shared/ui/HistoryNotice';
import { MIN_ZOOM_MS, type TimeRange } from '../chartSync';

export interface ZoomBrushProps {
  /** History that exists (memory only); the brush cannot leave it. */
  available: TimeRange;
  /** Current zoom; `null` shows everything. */
  value: TimeRange | null;
  onChange: (range: TimeRange | null) => void;
  historyHours?: number;
}

const STEP_MS = 5 * 60_000;
const PAGE_MS = 30 * 60_000;

type Handle = 'start' | 'end';

/** FE-27: two keyboard-operable handles select the visible range; "Reset zoom" shows everything again. */
export function ZoomBrush({ available, value, onChange, historyHours }: ZoomBrushProps) {
  const { t } = useTranslation();
  const min = Date.parse(available.from);
  const max = Date.parse(available.to);
  const span = Math.max(1, max - min);
  const current = value ?? available;
  const from = Date.parse(current.from);
  const to = Date.parse(current.to);

  const move = (handle: Handle, deltaMs: number | 'min' | 'max') => {
    if (handle === 'start') {
      const target = deltaMs === 'min' ? min : deltaMs === 'max' ? to - MIN_ZOOM_MS : from + deltaMs;
      const next = Math.min(Math.max(target, min), to - MIN_ZOOM_MS);
      if (next !== from) onChange({ from: new Date(next).toISOString(), to: current.to });
    } else {
      const target = deltaMs === 'min' ? from + MIN_ZOOM_MS : deltaMs === 'max' ? max : to + deltaMs;
      const next = Math.max(Math.min(target, max), from + MIN_ZOOM_MS);
      if (next !== to) onChange({ from: current.from, to: new Date(next).toISOString() });
    }
  };

  const onKeyDown = (handle: Handle) => (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number | 'min' | 'max'> = {
      ArrowRight: STEP_MS,
      ArrowUp: STEP_MS,
      ArrowLeft: -STEP_MS,
      ArrowDown: -STEP_MS,
      PageUp: PAGE_MS,
      PageDown: -PAGE_MS,
      Home: 'min',
      End: 'max',
    };
    const delta = keys[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    move(handle, delta);
  };

  const pct = (at: number) => `${(((at - min) / span) * 100).toFixed(2)}%`;
  const slider = (handle: Handle, at: number) => (
    <div
      role="slider"
      tabIndex={0}
      aria-label={t(handle === 'start' ? 'viz.zoom.start' : 'viz.zoom.end')}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={at}
      aria-valuetext={formatTime(new Date(at))}
      onKeyDown={onKeyDown(handle)}
      className="absolute top-1/2 h-[1.2rem] w-[0.5rem] -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-[0.2rem] border border-line-2 bg-text outline-none focus-visible:ring-2 focus-visible:ring-info"
      style={{ left: pct(at) }}
    />
  );

  return (
    <div className="flex flex-col gap-[0.35rem]">
      <div className="relative mx-[0.4rem] h-[1.4rem]">
        <div className="absolute inset-x-0 top-1/2 h-[0.3rem] -translate-y-1/2 rounded-full bg-s3" />
        <div className="absolute top-1/2 h-[0.3rem] -translate-y-1/2 rounded-full bg-info/50" style={{ left: pct(from), width: `calc(${pct(to)} - ${pct(from)})` }} />
        {slider('start', from)}
        {slider('end', to)}
      </div>
      <div className="flex items-center justify-between gap-[0.6rem] text-[0.72rem] text-muted">
        <span className="font-mono tabular-nums">{value ? t('viz.zoom.showing', { from: formatTime(value.from), to: formatTime(value.to) }) : ''}</span>
        <button
          type="button"
          disabled={!value}
          onClick={() => onChange(null)}
          className="rounded-[0.4rem] border border-line-2 px-[0.5rem] py-[0.15rem] text-text disabled:opacity-40"
        >
          {t('viz.zoom.reset')}
        </button>
      </div>
      {historyHours !== undefined && <HistoryNotice windowHours={historyHours} />}
    </div>
  );
}
