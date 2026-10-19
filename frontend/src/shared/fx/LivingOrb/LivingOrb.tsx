import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatReading, ruleText } from '@/domains/monitor/rules';
import type { Group } from '@/shared/api/types';
import { currentLocale } from '@/shared/i18n/i18n';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { useFxLevel } from '../FxProvider';
import { webglAvailable } from '../HeroOrb/HeroOrb';
import { useFxPalette } from '../palette';
import { buildOrbModel, nextSatellite, type OrbMonitor } from './orbModel';
import { satelliteSvgPoint, statusColor } from './orbProjection';
import { orbSummary, statusLabel } from './orbText';
import { OrbSvg } from './OrbSvg';
import type { OrbView } from './LivingOrbScene';

const LivingOrbScene = lazy(() => import('./LivingOrbScene').then((m) => ({ default: m.LivingOrbScene })));

export interface LivingOrbProps {
  monitors: readonly OrbMonitor[];
  groups: readonly Group[];
  uptime24h?: number;
  /** Console and touch walls: hover tooltip, click / Enter to open, drag to rotate, scroll to zoom, legend. */
  interactive?: boolean;
  onOpen?: (monitorId: string) => void;
  /** Shown at the `off` level (flat 2D symbol). */
  fallback?: ReactNode;
  className?: string;
}

const LEGEND = ['core', 'rings', 'satellites', 'pulse', 'near', 'down', 'maintenance'] as const;

/**
 * FE-59 Living orb: a live map of the system (docs/03-design.md §4.2). Every value lives in the DOM
 * (summary, tooltip, legend); the canvas only draws shapes and colors.
 */
export function LivingOrb({ monitors, groups, uptime24h, interactive = false, onOpen, fallback = null, className = '' }: LivingOrbProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const fx = useFxLevel();
  const palette = useFxPalette();
  const summaryId = useId();
  const model = useMemo(() => buildOrbModel({ monitors, groups, uptime24h }), [monitors, groups, uptime24h]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [legend, setLegend] = useState(false);
  const [ready, setReady] = useState(false);
  const view = useRef<OrbView>({ yaw: 0, pitch: 0, zoom: 1 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const tooltip = useRef<HTMLDivElement | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const live3d = fx.orb && webglAvailable();

  useEffect(() => {
    if (!live3d) return;
    const id = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(id);
  }, [live3d]);

  useEffect(() => {
    const el = container.current;
    if (!el || !interactive) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      view.current.zoom = Math.min(1.5, Math.max(0.75, view.current.zoom * (event.deltaY > 0 ? 0.92 : 1.08)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [interactive]);

  const activeId = hoverId ?? focusId;
  const active = model.satellites.find((s) => s.id === activeId) ?? null;
  const activeMonitor = active && active.count === 1 ? monitors.find((m) => m.id === active.monitorIds[0]) : undefined;
  const summary = orbSummary(model, t);
  const is3d = live3d && ready;

  const open = (satelliteId: string) => {
    const sat = model.satellites.find((s) => s.id === satelliteId);
    const target = sat?.monitorIds[0];
    if (target && sat.count === 1) onOpen?.(target);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusId(nextSatellite(model, focusId, event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Enter' && focusId) {
      open(focusId);
    } else if (event.key === 'Escape') {
      setFocusId(null);
    }
  };

  const pointer = interactive
    ? {
        onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
          drag.current = { x: event.clientX, y: event.clientY };
        },
        onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
          if (!drag.current || event.buttons === 0) return;
          view.current.yaw += (event.clientX - drag.current.x) * 0.006;
          view.current.pitch = Math.min(0.35, Math.max(-0.35, view.current.pitch + (event.clientY - drag.current.y) * 0.004));
          drag.current = { x: event.clientX, y: event.clientY };
        },
        onPointerUp: () => {
          drag.current = null;
        },
      }
    : {};

  if (fx.level === 'off') {
    return (
      <div className={`flex flex-col items-center gap-[0.5rem] ${className}`} data-testid="living-orb" data-mode="2d">
        {fallback}
        <p id={summaryId} className="m-0 text-[0.8rem] text-muted">
          {summary}
        </p>
      </div>
    );
  }

  const svgPoint = !is3d && active ? satelliteSvgPoint(model, active.id) : null;

  return (
    <div className={`relative flex flex-col items-center gap-[0.4rem] ${className}`} data-testid="living-orb" data-mode={is3d ? '3d' : 'svg'}>
      <div
        ref={container}
        role="group"
        aria-label={t('fx.orb.label')}
        aria-describedby={summaryId}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={interactive ? onKeyDown : undefined}
        onBlur={() => setFocusId(null)}
        {...pointer}
        className={`relative h-full min-h-0 w-full flex-1 ${interactive ? 'cursor-grab touch-none active:cursor-grabbing' : ''}`}
      >
        <div aria-hidden="true" className="absolute inset-0">
          {is3d ? (
            <Suspense fallback={<OrbSvg model={model} palette={palette} className="size-full" />}>
              <LivingOrbScene
                model={model}
                palette={palette}
                intensity={fx.intensity}
                view={view}
                focusedId={activeId}
                tooltip={tooltip}
                {...(interactive ? { onHover: setHoverId, onSelect: open } : {})}
              />
            </Suspense>
          ) : (
            <OrbSvg model={model} palette={palette} focusedId={activeId} className="size-full" />
          )}
        </div>
        {active && (
          <div
            ref={tooltip}
            role="tooltip"
            className="pointer-events-none absolute top-0 left-0 z-10"
            style={svgPoint ? { left: `${svgPoint.x * 100}%`, top: `${svgPoint.y * 100}%` } : undefined}
          >
            <div className="ml-[0.8rem] -translate-y-1/2 rounded-[0.5rem] border border-line-2 bg-s2/95 px-[0.7rem] py-[0.45rem] text-[0.8rem] whitespace-nowrap shadow-none">
              <div className="flex items-center gap-[0.4rem] font-semibold">
                <span className="size-[0.5rem] rounded-full" style={{ background: statusColor(active.status, palette) }} />
                {activeMonitor ? <SafeValue value={activeMonitor.name} /> : t('fx.orb.aggregate', { count: active.count })}
                <span className="text-muted">· {statusLabel(active.status, t)}</span>
                {active.hollow && <span className="text-muted">· {t('fx.orb.maintenance')}</span>}
              </div>
              {activeMonitor && (
                <div className="mt-[0.15rem] font-mono text-muted">
                  <SafeValue value={activeMonitor.value} format={() => formatReading(activeMonitor.value, activeMonitor.unit, locale)} />
                  {activeMonitor.rule && <> · {t('rule.text', { rule: ruleText(activeMonitor.rule, locale) })}</>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <p id={summaryId} className="m-0 text-center text-[0.8rem] text-muted">
        {summary}
      </p>
      {interactive && (
        <span className="sr-only" aria-live="polite">
          {focusId && active && (
            <>
              {activeMonitor ? <SafeValue value={activeMonitor.name} /> : t('fx.orb.aggregate', { count: active.count })},{' '}
              {statusLabel(active.status, t)}
            </>
          )}
        </span>
      )}
      {interactive && (
        <div className="absolute top-0 right-0 flex flex-col items-end gap-[0.4rem]">
          <button
            type="button"
            aria-expanded={legend}
            onClick={() => setLegend((v) => !v)}
            className="rounded-full border border-line-2 bg-s2/80 px-[0.7rem] py-[0.25rem] text-[0.78rem] text-muted hover:text-text active:scale-[0.98]"
          >
            {t('fx.orb.legend.toggle')}
          </button>
          {legend && (
            <div className="max-w-[22rem] rounded-[0.6rem] border border-line-2 bg-s2/95 p-[0.7rem] text-[0.78rem] text-muted">
              <p className="m-0 mb-[0.3rem] font-semibold text-text">{t('fx.orb.legend.title')}</p>
              <ul className="m-0 grid list-none gap-[0.2rem] p-0">
                {LEGEND.map((key) => (
                  <li key={key}>{t(`fx.orb.legend.${key}`)}</li>
                ))}
              </ul>
              <p className="m-0 mt-[0.4rem]">
                {t('fx.orb.keys')} · {t('fx.orb.open')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
