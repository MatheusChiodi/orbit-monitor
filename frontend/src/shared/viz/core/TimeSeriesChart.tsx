import { useId, useMemo, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { formatNumber, formatTime } from '@/shared/format';
import { useLocale } from '@/shared/i18n/useLocale';
import { SafeValue, safeText, type ProbeValue } from '@/shared/privacy';
import { FlashValue } from '@/shared/ui/FlashValue';
import type { ChartAnnotation } from '../annotations';
import { ChartAnnotations } from '../ChartAnnotations/ChartAnnotations';
import { chartSync as defaultSync, type ChartSyncStore } from '../chartSync';
import { DEFAULT_HISTORY_HOURS } from '../compatibility';
import { ZoomBrush } from '../ZoomBrush/ZoomBrush';
import { STATUS_COLOR } from './palette';
import { VizFrame } from './VizFrame';
import { withUnit } from './format';
import { areaPath, gaps, lastValue, linePath, makeScales, nearestIndex, type Box, type NumericPoint } from './series';
import { markTransition, useVizLevel } from './useVizLevel';
import { toStatus, type ModeProps, type VizValue } from '../types';

export type SeriesVariant = 'line' | 'area' | 'step-line';
const WEEK_HOURS = 7 * 24;
const BOX: Box = { width: 600, height: 140, pad: 6 };

export interface TimeSeriesProps extends ModeProps {
  /** FE-25: draw the same period last week as a ghost line. */
  overlay?: 'week-over-week';
  /** FE-27: charts with the same group share crosshair and zoom. */
  syncGroup?: string;
  sync?: ChartSyncStore;
  /** FE-26: incidents, maintenance windows and deploys over the time axis. */
  annotations?: ChartAnnotation[];
  /** FE-27: shows the zoom brush under the chart. */
  zoomable?: boolean;
}

/** Text states (step line) become lanes in order of first appearance. */
function toNumeric(points: readonly { at: string; value: VizValue }[]): { numeric: NumericPoint[]; lanes: string[] } {
  const lanes: string[] = [];
  const numeric = points.map((p) => {
    if (typeof p.value === 'string') {
      const text = safeText(p.value);
      if (!lanes.includes(text)) lanes.push(text);
      return { at: p.at, value: lanes.indexOf(text) };
    }
    return { at: p.at, value: p.value };
  });
  return { numeric, lanes };
}

/** Shared renderer of modes 6–8 (line, area, step line) with crosshair, overlay, annotations and zoom. */
export function TimeSeriesChart({ variant, data, animation, className, overlay, syncGroup, sync = defaultSync, annotations, zoomable }: TimeSeriesProps & { variant: SeriesVariant }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const level = useVizLevel(animation);
  const localGroup = useId();
  const group = syncGroup ?? localGroup;
  const crosshairAt = useStore(sync, (s) => s.crosshairs[group] ?? null);
  const zoom = useStore(sync, (s) => s.zooms[group] ?? null);
  const historyHours = data.historyHours ?? DEFAULT_HISTORY_HOURS;
  const all = data.points ?? [];
  const points = useMemo(() => {
    if (!zoom) return all;
    const from = Date.parse(zoom.from);
    const to = Date.parse(zoom.to);
    return all.filter((p) => Date.parse(p.at) >= from && Date.parse(p.at) <= to);
  }, [all, zoom]);
  const { numeric, lanes } = useMemo(() => toNumeric(points), [points]);
  const status = toStatus(data.status);
  const color = STATUS_COLOR[status];

  const current = lastValue(points);
  const format = (v: ProbeValue) => (typeof v === 'number' ? withUnit(formatNumber(v, locale), data.unit) : safeText(v));
  const wantsGhost = overlay === 'week-over-week';
  const ghost = wantsGhost && historyHours >= WEEK_HOURS && (data.previousWeek?.length ?? 0) > 0 ? data.previousWeek! : null;
  const ghostNumeric = ghost ? ghost.map((p) => ({ at: p.at, value: typeof p.value === 'number' ? p.value : null })) : [];
  const extra = [...ghostNumeric.map((p) => p.value).filter((v): v is number => v !== null)];
  if (data.rule && lanes.length === 0) extra.push(data.rule.limit);
  const range = zoom ? { from: Date.parse(zoom.from), to: Date.parse(zoom.to) } : undefined;
  const s = numeric.length ? makeScales(numeric, BOX, extra, range) : null;

  const crosshairIndex = crosshairAt && s ? nearestIndex(points, Date.parse(crosshairAt)) : -1;
  const crosshairPoint = crosshairIndex >= 0 ? points[crosshairIndex] : undefined;

  const moveTo = (index: number) => {
    const point = points[Math.max(0, Math.min(points.length - 1, index))];
    if (point) sync.getState().setCrosshair(group, point.at);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (points.length === 0) return;
    const index = crosshairIndex;
    if (event.key === 'ArrowRight') moveTo(index < 0 ? 1 : index + 1);
    else if (event.key === 'ArrowLeft') moveTo(index < 0 ? points.length - 2 : index - 1);
    else if (event.key === 'Home') moveTo(0);
    else if (event.key === 'End') moveTo(points.length - 1);
    else if (event.key === 'Escape') sync.getState().clearCrosshair(group);
    else return;
    event.preventDefault();
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!s) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const fraction = (event.clientX - rect.left) / rect.width;
    moveTo(nearestIndex(points, s.t0 + fraction * (s.t1 - s.t0)));
  };

  const baseline = BOX.height - BOX.pad;
  const label = t('viz.chart.label', { label: safeText(data.label), current: format(current) });
  const ariaLabel = lanes.length ? `${label}. ${t('viz.chart.lanes', { lanes: lanes.join(', ') })}` : label;
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <VizFrame
      mode={variant}
      level={level}
      label={data.label}
      status={data.status}
      empty={points.length === 0}
      historyHours={historyHours}
      className={className}
      footer={
        wantsGhost ? (
          ghost ? (
            <ul aria-label={t('viz.legend')} className="m-0 flex list-none flex-wrap gap-[0.8rem] p-0 text-[0.72rem] text-muted">
              <li className="inline-flex items-center gap-[0.35rem]">
                <span aria-hidden className="inline-block h-[2px] w-[0.9rem]" style={{ background: color }} />
                <SafeValue value={data.label} />
              </li>
              <li className="inline-flex items-center gap-[0.35rem]">
                <span aria-hidden className="inline-block h-0 w-[0.9rem] border-t-2 border-dashed border-muted" />
                {t('viz.wow.legend')}
              </li>
            </ul>
          ) : (
            <p className="m-0 text-[0.72rem] text-muted">{t('viz.wow.unavailable', { hours: historyHours })}</p>
          )
        ) : undefined
      }
    >
      <div className="flex items-baseline gap-[0.5rem] font-mono text-[1.15rem] font-semibold tabular-nums">
        <FlashValue value={typeof current === 'number' ? current : null}>
          <SafeValue value={current} format={format} />
        </FlashValue>
      </div>
      <div className="relative">
        <div
          role="img"
          tabIndex={0}
          aria-label={ariaLabel}
          onKeyDown={onKeyDown}
          onPointerMove={onPointerMove}
          onPointerLeave={() => sync.getState().clearCrosshair(group)}
          className="rounded-[0.4rem] outline-none focus-visible:ring-2 focus-visible:ring-info"
        >
          {s && (
            <svg viewBox={`0 0 ${BOX.width} ${BOX.height}`} preserveAspectRatio="none" aria-hidden className="block h-[7.5rem] w-full">
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1={0} x2={BOX.width} y1={BOX.height * f} y2={BOX.height * f} stroke="var(--line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              {gaps(numeric, s).map((g) => (
                <rect key={`${g.from}-${g.to}`} data-gap x={g.from} width={Math.max(1, g.to - g.from)} y={0} height={BOX.height} fill="var(--down)" opacity={0.1} />
              ))}
              {data.rule && lanes.length === 0 && (
                <line
                  data-threshold
                  x1={0}
                  x2={BOX.width}
                  y1={s.y(data.rule.limit)}
                  y2={s.y(data.rule.limit)}
                  stroke="var(--text)"
                  strokeOpacity={0.45}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {ghost && (
                <path
                  data-series="previous-week"
                  d={linePath(ghostNumeric, s)}
                  fill="none"
                  stroke="var(--muted)"
                  strokeOpacity={0.7}
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {variant === 'area' && <path d={areaPath(numeric, s, baseline)} fill={color} fillOpacity={0.12} className={markTransition(level)} />}
              <path
                data-series="current"
                d={linePath(numeric, s, variant === 'step-line')}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className={markTransition(level)}
              />
              {crosshairPoint && (
                <line
                  data-crosshair
                  x1={s.x(Date.parse(crosshairPoint.at))}
                  x2={s.x(Date.parse(crosshairPoint.at))}
                  y1={0}
                  y2={BOX.height}
                  stroke="var(--text)"
                  strokeOpacity={0.6}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
          )}
        </div>
        {annotations && s && (
          <ChartAnnotations
            annotations={annotations}
            range={{ from: new Date(s.t0).toISOString(), to: new Date(s.t1).toISOString() }}
            className="absolute inset-0"
          />
        )}
      </div>
      <div className="flex justify-between font-mono text-[0.62rem] text-dim tabular-nums">
        <span>{first ? formatTime(first.at) : ''}</span>
        <span>{last && last !== first ? formatTime(last.at) : ''}</span>
      </div>
      <div role="status" aria-live="polite" className="min-h-[1rem] font-mono text-[0.72rem] text-muted tabular-nums">
        {crosshairPoint && (
          <>
            <span>{formatTime(crosshairPoint.at)}</span>
            {' · '}
            <SafeValue value={crosshairPoint.value} format={format} />
          </>
        )}
      </div>
      {zoomable && first && last && (
        <ZoomBrush
          available={{ from: first.at, to: last.at }}
          value={zoom}
          onChange={(next) => (next ? sync.getState().setZoom(group, next) : sync.getState().resetZoom(group))}
        />
      )}
    </VizFrame>
  );
}
