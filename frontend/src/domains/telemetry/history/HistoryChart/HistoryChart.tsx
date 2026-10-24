import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { formatReading } from '@/domains/monitor/rules';
import type { Status } from '@/shared/api/types';
import { formatNumber } from '@/shared/format';
import { currentLocale, type Locale } from '@/shared/i18n/i18n';
import { chartGeometry, nearestIndex, type ChartBox, type ChartPoint } from './chartGeometry';

export interface HistoryChartProps {
  points: readonly ChartPoint[];
  /** The monitor's main rule limit, drawn as a dashed line. */
  limit: number | null;
  unit?: string;
  /** Accessible name of the chart. */
  label: string;
  status: Status;
  className?: string;
}

const HEIGHT = 200;
const FALLBACK_WIDTH = 640;
const STROKE: Record<Status, string> = { OK: 'stroke-ok', WARN: 'stroke-warn', DOWN: 'stroke-down' };
const FILL: Record<Status, string> = { OK: 'fill-ok', WARN: 'fill-warn', DOWN: 'fill-down' };

function timeLabel(at: Date, spanMs: number, locale: Locale): string {
  const options: Intl.DateTimeFormatOptions =
    spanMs > 2 * 86_400_000 ? { day: '2-digit', month: '2-digit' } : { hour: '2-digit', minute: '2-digit', hour12: false };
  return new Intl.DateTimeFormat(locale, options).format(at);
}

const pathOf = (segment: readonly { x: number; y: number }[]) => segment.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

/**
 * History of one monitor over the chosen period: value axis, time axis, the rule limit as a dashed
 * line and a readout that follows the pointer or the arrow keys (Home / End jump to the ends).
 */
export function HistoryChart({ points, limit, unit, label, status, className = '' }: HistoryChartProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const box: ChartBox = { width, height: HEIGHT, left: 52, right: 12, top: 10, bottom: 26 };
  const g = chartGeometry(points, limit, box);
  const span = (points.at(-1)?.at.getTime() ?? 0) - (points[0]?.at.getTime() ?? 0);
  const reading = (value: number | null) => (value === null ? t('ops.detail.chart.noData') : formatReading(value, unit, locale));
  const limitText = limit === null ? null : t('ops.detail.chart.threshold', { value: reading(limit) });

  function onKey(event: KeyboardEvent<SVGSVGElement>) {
    const last = points.length - 1;
    const from = active ?? last;
    const next =
      event.key === 'ArrowLeft' ? Math.max(from - 1, 0)
      : event.key === 'ArrowRight' ? Math.min(from + 1, last)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  }

  function onPointer(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setActive(nearestIndex(g.xs, ((event.clientX - rect.left) / (rect.width || 1)) * width));
  }

  const point = active === null ? undefined : points[active];
  const px = active === null ? null : g.xs[active]!;
  const py = active === null ? null : g.ys[active]!;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <svg
        role="img"
        aria-label={limitText ? `${label}. ${limitText}` : label}
        tabIndex={0}
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="block touch-pan-y rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onKeyDown={onKey}
        onFocus={() => setActive((a) => a ?? (points.length ? points.length - 1 : null))}
        onBlur={() => setActive(null)}
        onPointerMove={onPointer}
        onPointerLeave={() => setActive(null)}
      >
        {g.yTicks.map((tick) => (
          <g key={tick.value} data-testid="y-tick">
            <line x1={box.left} x2={width - box.right} y1={tick.y} y2={tick.y} className="stroke-line" strokeWidth={1} />
            <text x={box.left - 8} y={tick.y} dy="0.32em" textAnchor="end" className="fill-dim font-mono text-xs">
              {formatNumber(tick.value, locale)}
            </text>
          </g>
        ))}
        {g.xTicks.map((tick, i) => (
          <text
            key={tick.at.getTime()}
            data-testid="x-tick"
            x={tick.x}
            y={HEIGHT - 6}
            textAnchor={i === 0 ? 'start' : i === g.xTicks.length - 1 ? 'end' : 'middle'}
            className="fill-dim font-mono text-xs"
          >
            {timeLabel(tick.at, span, locale)}
          </text>
        ))}
        {g.limitY !== null && limitText && (
          <g>
            <line x1={box.left} x2={width - box.right} y1={g.limitY} y2={g.limitY} className="stroke-muted" strokeWidth={1} strokeDasharray="6 5" />
            <text x={width - box.right} y={g.limitY - 6} textAnchor="end" className="fill-muted text-xs">
              {limitText}
            </text>
          </g>
        )}
        {g.segments.map((segment, i) =>
          segment.length === 1 ? (
            <circle key={i} cx={segment[0]!.x} cy={segment[0]!.y} r={2} className={FILL[status]} />
          ) : (
            <path key={i} d={pathOf(segment)} className={`fill-none ${STROKE[status]}`} strokeWidth={2} strokeLinejoin="round" />
          ),
        )}
        {px !== null && (
          <g aria-hidden>
            <line x1={px} x2={px} y1={box.top} y2={HEIGHT - box.bottom} className="stroke-line-2" strokeWidth={1} />
            {py !== null && <circle cx={px} cy={py} r={4} className={`${FILL[status]} stroke-bg`} strokeWidth={2} />}
          </g>
        )}
      </svg>
      {point && px !== null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-sm border border-line bg-s2 px-2 py-1 font-mono text-xs whitespace-nowrap shadow-popover"
          style={{ left: Math.min(Math.max(px, 72), width - 72) }}
        >
          {t('ops.detail.chart.point', {
            time: new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(point.at),
            value: reading(point.value),
          })}
        </div>
      )}
    </div>
  );
}
