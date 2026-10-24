import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { formatReading } from '@/domains/monitor/rules';
import type { Group, MonitorView, Status } from '@/shared/api/types';
import { currentLocale } from '@/shared/i18n/i18n';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import { safeText } from '@/shared/privacy/redact';
import { railCounts, railLayout, railMonitors, trackPoint, type TrackBox } from './railLayout';

export interface OrbitRailProps {
  monitors: readonly MonitorView[];
  groups: readonly Group[];
  onOpen: (id: string) => void;
  className?: string;
}

const HEIGHT = 72;
const FALLBACK_WIDTH = 960;

const FILL: Record<Status, string> = { OK: 'fill-ok', WARN: 'fill-warn', DOWN: 'fill-down' };

/**
 * FE-68 signature of the monitor list: an elliptical track where every monitor is a satellite colored
 * by state. Down satellites sit at 12 o'clock and pulse; hover or focus names them; Enter or a click
 * opens the monitor. One tab stop, arrows move between satellites.
 */
export function OrbitRail({ monitors, groups, onOpen, className = '' }: OrbitRailProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const level = useAnimationLevel();
  const pulse = level === 'standard' || level === 'expressive';
  const wrapRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const visible = railMonitors(monitors);
  const satellites = railLayout(visible, groups);
  const counts = railCounts(visible);
  const box: TrackBox = { width, height: HEIGHT };
  const focusIndex = Math.min(active, Math.max(satellites.length - 1, 0));

  const describe = (s: MonitorView) =>
    t('ops.rail.satellite', {
      name: safeText(s.name),
      status: t(`ui.status.${s.status}`),
      value: formatReading(s.value, s.unit, locale),
    });

  function move(event: KeyboardEvent<HTMLAnchorElement>, index: number) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next: number | null = null;
    if (event.key in keys) next = (index + keys[event.key]! + satellites.length) % satellites.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = satellites.length - 1;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(satellites[index]!.monitor.id);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    setShown(next);
    linkRefs.current[next]?.focus();
  }

  const summary =
    visible.length === 0
      ? t('ops.rail.empty')
      : counts.down + counts.warn === 0
        ? t('ops.rail.allOk', { count: counts.ok })
        : [
            counts.down > 0 && t('ops.rail.down', { count: counts.down }),
            counts.warn > 0 && t('ops.rail.warn', { count: counts.warn }),
            counts.ok > 0 && t('ops.rail.ok', { count: counts.ok }),
          ]
            .filter(Boolean)
            .join(' · ');

  const tip = shown !== null ? satellites[shown] : undefined;
  const tipPoint = tip ? trackPoint(tip.angle, box) : null;

  return (
    <section aria-label={t('ops.rail.label')} className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6 ${className}`}>
      <div ref={wrapRef} className="relative h-18 min-w-0 flex-1">
        <svg width="100%" height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} className="block overflow-visible">
          <ellipse
            cx={width / 2}
            cy={HEIGHT / 2}
            rx={Math.max(width / 2 - 16, 0)}
            ry={HEIGHT / 2 - 10}
            className="fill-none stroke-line"
            strokeWidth={1.5}
          />
          {satellites.map((s, index) => {
            const { x, y } = trackPoint(s.angle, box);
            const down = s.monitor.status === 'DOWN';
            return (
              <a
                key={s.monitor.id}
                ref={(el) => {
                  linkRefs.current[index] = el;
                }}
                href={`#/monitors/${encodeURIComponent(s.monitor.id)}`}
                data-monitor={s.monitor.id}
                aria-label={describe(s.monitor)}
                tabIndex={index === focusIndex ? 0 : -1}
                className="group cursor-pointer outline-none"
                onClick={(event) => {
                  event.preventDefault();
                  onOpen(s.monitor.id);
                }}
                onKeyDown={(event) => move(event, index)}
                onFocus={() => {
                  setActive(index);
                  setShown(index);
                }}
                onBlur={() => setShown(null)}
                onMouseEnter={() => setShown(index)}
                onMouseLeave={() => setShown(null)}
              >
                {down && pulse && (
                  <m.circle
                    data-pulse
                    cx={x}
                    cy={y}
                    r={7}
                    className="fill-down"
                    initial={{ opacity: 0.5, r: 7 }}
                    animate={{ opacity: 0, r: 16 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                <circle data-ring cx={x} cy={y} r={down ? 10 : 9} className="fill-transparent stroke-transparent group-hover:stroke-line-2 group-focus-visible:stroke-accent" strokeWidth={2} />
                <circle cx={x} cy={y} r={down ? 6 : 4.5} className={`${FILL[s.monitor.status]} stroke-bg`} strokeWidth={2} />
              </a>
            );
          })}
        </svg>
        {tip && tipPoint && (
          <div
            role="tooltip"
            className={`pointer-events-none absolute z-10 -translate-x-1/2 rounded-sm border border-line bg-s2 px-2 py-1 text-xs whitespace-nowrap shadow-popover ${
              tipPoint.y < HEIGHT / 2 ? 'top-full mt-1' : 'bottom-full mb-1'
            }`}
            style={{ left: Math.min(Math.max(tipPoint.x, 64), width - 64) }}
          >
            <span className="font-medium text-text">{safeText(tip.monitor.name)}</span>
            <span className="ml-2 font-mono text-muted">{formatReading(tip.monitor.value, tip.monitor.unit, locale)}</span>
          </div>
        )}
      </div>
      <p className="m-0 shrink-0 text-sm text-muted" aria-live="polite">
        {summary}
      </p>
    </section>
  );
}
