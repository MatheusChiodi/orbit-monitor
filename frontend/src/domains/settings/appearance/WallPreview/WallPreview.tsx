import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { themeVariables, type OrbitTheme } from '@/shared/theme';

/** Inline CSS variables so everything inside renders with `theme`, independent of the page theme. */
export function themeStyle(theme: OrbitTheme): CSSProperties {
  return themeVariables(theme) as CSSProperties;
}

// Fixed sample: 18 monitors, one DOWN and two WARN, like a calm-but-not-quiet wall.
const MATRIX = ['ok', 'ok', 'ok', 'warn', 'ok', 'ok', 'ok', 'ok', 'down', 'ok', 'ok', 'ok', 'ok', 'ok', 'warn', 'ok', 'ok', 'ok'] as const;
const LATENCY = [32, 30, 35, 31, 44, 38, 52, 47, 61, 58, 72, 66];
const BG = { ok: 'bg-ok', warn: 'bg-warn', down: 'bg-down' } as const;

function Sparkline({ values, color, className = '' }: { values: number[]; color: string; className?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / (max - min || 1)) * 26}`).join(' ');
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={className} aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface WallPreviewProps {
  theme: OrbitTheme;
  /** `card`: thumbnail for the gallery (decorative); `full`: labelled region with text states. */
  size?: 'card' | 'full';
  label?: string;
}

/** Hero + monitor matrix + chart, the three things a wall is recognised by. */
export function WallPreview({ theme, size = 'full', label }: WallPreviewProps) {
  const { t } = useTranslation();
  const full = size === 'full';
  const statusLabel = (s: 'OK' | 'WARN' | 'DOWN') => t(`status.label.${s}`);
  return (
    <section
      role={full ? 'region' : undefined}
      aria-label={full ? label : undefined}
      aria-hidden={full ? undefined : true}
      style={themeStyle(theme)}
      className={`grid aspect-video grid-cols-[1.5fr_1fr] grid-rows-[1.2fr_1fr] gap-[4%] overflow-hidden bg-bg p-[4%] ${full ? 'rounded-[0.6rem]' : 'rounded-[0.45rem]'}`}
    >
      <div className="relative col-span-2 flex items-center gap-[4%] overflow-hidden rounded-[0.35rem] border border-down/60 bg-gradient-to-b from-down/20 to-s1 pl-[4%]">
        <span className="absolute inset-y-0 left-0 w-[1.2%] bg-down" />
        <div className="min-w-0 flex-1">
          {full ? (
            <span className="text-[0.62rem] font-bold tracking-[0.12em] text-down-text">{statusLabel('DOWN')}</span>
          ) : (
            <span className="block h-[0.3rem] w-[18%] rounded-full bg-down-text" />
          )}
          {full ? (
            <p className="truncate font-display text-[1rem] font-bold text-text">{t('theme.mini.hero')}</p>
          ) : (
            <span className="mt-[6%] block h-[0.45rem] w-[62%] rounded-full bg-text" />
          )}
        </div>
        <Sparkline values={LATENCY} color="var(--down)" className="h-[60%] w-[30%] shrink-0 pr-[4%]" />
      </div>

      <div className="grid grid-cols-6 content-center gap-[6%] rounded-[0.35rem] border border-line bg-s1 p-[6%]">
        {MATRIX.map((s, i) => (
          <span key={i} className={`aspect-square rounded-[22%] ${BG[s]} ${s === 'ok' ? 'opacity-80' : ''}`} />
        ))}
      </div>

      <div className="flex flex-col justify-between rounded-[0.35rem] border border-line bg-s1 p-[6%]">
        {full ? (
          <div className="flex gap-2 text-[0.6rem] font-semibold">
            <span className="text-warn-text">{statusLabel('WARN')}</span>
            <span className="text-ok-text">{statusLabel('OK')}</span>
          </div>
        ) : (
          <div className="flex gap-[6%]">
            {theme.chart.slice(0, 3).map((_, i) => (
              <span key={i} className="h-[0.25rem] w-[18%] rounded-full" style={{ background: `var(--chart-${i + 1})` }} />
            ))}
          </div>
        )}
        <div className="relative h-[60%]">
          <Sparkline values={LATENCY} color="var(--chart-1)" className="absolute inset-0 size-full" />
          <Sparkline values={[...LATENCY].reverse()} color="var(--chart-2)" className="absolute inset-0 size-full" />
        </div>
      </div>
    </section>
  );
}
