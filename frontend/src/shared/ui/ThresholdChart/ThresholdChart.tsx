import { useEffect, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { Rule, Status } from '@/shared/api/types';
import { formatDecimal, formatInteger, formatNumber } from '@/shared/format';
import { currentLocale, type Locale } from '@/shared/i18n/i18n';
import { detectSensitive, safeText } from '@/shared/privacy/redact';
import { thresholdGeometry, type ChartBox, type ThresholdGeometry } from './geometry';

/** Canvas cannot read CSS vars; mirrors the tokens of docs/03-design.md. */
const COLOR: Record<Status, string> = { OK: '#22c55e', WARN: '#f5a524', DOWN: '#ff3b4f' };
const DOWN_RGB = '255, 59, 79';

const FALLBACK = { width: 600, height: 200 };
const PADDING = { top: 10, right: 12, bottom: 6, left: 4 };

export interface ThresholdChartProps {
  series: readonly (number | null)[];
  rule?: Rule;
  status: Status;
  className?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function formatPoint(value: number, locale: Locale): string {
  if (detectSensitive(value)) return safeText(value);
  return Number.isInteger(value) ? formatInteger(value, locale) : formatDecimal(value, 1, locale);
}

function describe(series: readonly (number | null)[], rule: Rule | undefined, t: TFunction, locale: Locale): string {
  const value = [...series].reverse().find((v): v is number => v !== null);
  const current = value === undefined ? t('reading.noResponse') : t('chart.current', { value: formatPoint(value, locale) });
  if (!rule) return t('chart.labelNoRule', { current });
  const ruleText = `${rule.field} ${rule.operator} ${formatNumber(rule.limit, locale)}`;
  return t('chart.label', { field: rule.field, current, rule: ruleText });
}

function draw(ctx: CanvasRenderingContext2D, g: ThresholdGeometry, box: ChartBox, status: Status, dpr: number) {
  const color = COLOR[status];
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, box.width, box.height);

  // 5% grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  for (let i = 0; i <= 4; i += 1) {
    const y = box.padding.top + ((box.height - box.padding.top - box.padding.bottom) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(box.padding.left, y);
    ctx.lineTo(box.width - box.padding.right, y);
    ctx.stroke();
  }

  // no-response gaps
  ctx.fillStyle = `rgba(${DOWN_RGB}, 0.14)`;
  for (const gap of g.gaps) {
    const x0 = box.padding.left + (gap.from - 0.5) * g.step;
    const x1 = box.padding.left + (gap.to + 0.5) * g.step;
    ctx.fillRect(x0, box.padding.top, x1 - x0, box.height - box.padding.top - box.padding.bottom);
  }

  // violated area between the line and the limit
  if (g.limitY !== null) {
    ctx.fillStyle = hexToRgba(color, 0.17);
    let run: { x: number; y: number }[] = [];
    const flush = () => {
      if (run.length > 1 && g.limitY !== null) {
        ctx.beginPath();
        ctx.moveTo(run[0]!.x, g.limitY);
        for (const p of run) ctx.lineTo(p.x, p.y);
        ctx.lineTo(run.at(-1)!.x, g.limitY);
        ctx.closePath();
        ctx.fill();
      }
      run = [];
    };
    for (const p of g.points) {
      if (p && p.violated) run.push(p);
      else flush();
    }
    flush();
  }

  // series line
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  let penDown = false;
  for (const p of g.points) {
    if (!p) {
      penDown = false;
      continue;
    }
    if (penDown) ctx.lineTo(p.x, p.y);
    else ctx.moveTo(p.x, p.y);
    penDown = true;
  }
  ctx.stroke();

  // dashed white limit at 45%
  if (g.limitY !== null) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(box.padding.left, g.limitY);
    ctx.lineTo(box.width - box.padding.right, g.limitY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // dot on the current value
  if (g.current) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(g.current.x, g.current.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Hero threshold chart: custom canvas, as in the prototype. */
export function ThresholdChart({ series, rule, status, className = '' }: ThresholdChartProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(FALLBACK);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const box: ChartBox = { ...size, padding: PADDING };
  const limit = rule ? { limit: rule.limit, operator: rule.operator } : null;
  const geometry = thresholdGeometry(series, limit, box);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    draw(ctx, geometry, box, status, dpr);
  });

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div ref={wrapRef} className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={describe(series, rule, t, locale)}
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <div aria-hidden className="mt-[0.3rem] flex justify-between font-mono text-[0.62rem] text-dim">
        {geometry.ticks.map((tick) => (
          <span key={tick.minutes}>{tick.minutes === 0 ? t('chart.now') : `${tick.minutes}min`}</span>
        ))}
      </div>
    </div>
  );
}
