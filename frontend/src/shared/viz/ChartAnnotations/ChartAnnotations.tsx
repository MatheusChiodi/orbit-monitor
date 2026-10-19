import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '@/shared/format';
import { annotationsInRange, type AnnotationKind, type ChartAnnotation } from '../annotations';
import type { TimeRange } from '../chartSync';

export interface ChartAnnotationsProps {
  annotations: readonly ChartAnnotation[];
  /** Visible time range of the chart the markers sit on. */
  range: TimeRange;
  /** Fixed width in px; by default the overlay fills its positioned parent. */
  width?: number;
  onOpen?: (id: string) => void;
  className?: string;
}

/** Kinds differ by shape and glyph, not only by color. */
const GLYPH: Record<AnnotationKind, string> = { incident: '!', maintenance: 'M', deploy: 'D' };
const COLOR: Record<AnnotationKind, string> = { incident: 'var(--down)', maintenance: 'var(--info)', deploy: 'var(--muted)' };

/** FE-26: incident and deploy lines, maintenance bands, each with a labelled, keyboard-reachable marker. */
export function ChartAnnotations({ annotations, range, width, onOpen, className = '' }: ChartAnnotationsProps) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);
  const visible = annotationsInRange(annotations, range.from, range.to);
  if (visible.length === 0) return null;
  const start = Date.parse(range.from);
  const span = Math.max(1, Date.parse(range.to) - start);
  const pct = (iso: string) => `${(((Date.parse(iso) - start) / span) * 100).toFixed(2)}%`;
  const name = (a: ChartAnnotation) => {
    if (a.kind === 'maintenance') return t('viz.annotations.maintenance', { from: formatTime(a.at), to: formatTime(a.until ?? a.at) });
    if (a.kind === 'incident') return t('viz.annotations.incidentAt', { time: formatTime(a.at) });
    return t('viz.annotations.deployAt', { time: formatTime(a.at) });
  };
  const open = visible.find((a) => a.id === openId);
  return (
    <div className={`pointer-events-none relative h-full min-h-[1.5rem] ${className}`} style={width ? { width } : undefined}>
      {visible.map((a) => {
        const band = a.kind === 'maintenance' && a.until !== undefined;
        return (
          <div key={a.id}>
            {band ? (
              <span
                data-annotation="band"
                className="absolute inset-y-0 border-x border-info/40 bg-info/10"
                style={{ left: pct(a.at), width: `calc(${pct(a.until!)} - ${pct(a.at)})` }}
              />
            ) : (
              <span data-annotation="line" className="absolute inset-y-0 w-px" style={{ left: pct(a.at), background: COLOR[a.kind] }} />
            )}
            <button
              type="button"
              aria-label={name(a)}
              aria-expanded={openId === a.id}
              onClick={() => {
                setOpenId(openId === a.id ? null : a.id);
                onOpen?.(a.id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpenId(null);
              }}
              className="pointer-events-auto absolute top-0 grid size-[1.1rem] -translate-x-1/2 place-items-center rounded-full border border-line-2 bg-s3 font-mono text-[0.62rem] font-semibold text-text focus-visible:ring-2 focus-visible:ring-info"
              style={{ left: pct(a.at) }}
            >
              <span aria-hidden>{GLYPH[a.kind]}</span>
            </button>
          </div>
        );
      })}
      {open && (
        <p
          role="tooltip"
          className="pointer-events-auto absolute top-[1.4rem] z-10 m-0 max-w-[16rem] -translate-x-1/2 rounded-[0.4rem] border border-line-2 bg-s3 px-[0.6rem] py-[0.35rem] text-[0.78rem]"
          style={{ left: pct(open.at) }}
        >
          <span className="block text-[0.68rem] text-muted">{name(open)}</span>
          <span>{open.title}</span>
        </p>
      )}
    </div>
  );
}
