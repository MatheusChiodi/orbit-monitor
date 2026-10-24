import { useTranslation } from 'react-i18next';
import type { MonitorView, Status } from '@/shared/api/types';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { safeText } from '@/shared/privacy/redact';
import { DOT_CLASS, Sparkline, TEXT_CLASS } from '@/shared/ui';
import type { BlockKind } from '../layout/grid';

export type PreviewMonitor = Pick<MonitorView, 'id' | 'name' | 'status' | 'value' | 'unit' | 'series'>;

export interface BlockPreviewProps {
  kind: BlockKind;
  /** Live monitors (already loaded by the console); an empty list draws a neutral sketch. */
  monitors: readonly PreviewMonitor[];
  text?: string;
}

const RANK: Record<Status, number> = { DOWN: 0, WARN: 1, OK: 2 };
const byWorst = (a: PreviewMonitor, b: PreviewMonitor) => RANK[a.status] - RANK[b.status];

function Dot({ status }: { status: Status | null }) {
  return <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full ${status ? DOT_CLASS[status] : 'bg-line-2'}`} />;
}

function Rows({ monitors, empty }: { monitors: readonly PreviewMonitor[]; empty: number }) {
  const rows = monitors.length > 0 ? monitors.slice(0, 3) : Array.from({ length: empty }, () => null);
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {rows.map((m, i) => (
        <li key={m?.id ?? i} className="flex min-w-0 items-center gap-1.5">
          <Dot status={m?.status ?? null} />
          {m ? <span className="truncate">{safeText(m.name)}</span> : <span className="h-1.5 w-3/4 rounded-full bg-line" />}
        </li>
      ))}
    </ul>
  );
}

/** FE-11: a small, real sketch of what a wall block shows, drawn from the console's monitor list. */
export function BlockPreview({ kind, monitors, text }: BlockPreviewProps) {
  const { t } = useTranslation();
  const sorted = [...monitors].sort(byWorst);
  const problems = sorted.filter((m) => m.status !== 'OK');
  const first = monitors.find((m) => m.value !== null) ?? monitors[0];

  switch (kind) {
    case 'hero': {
      const worst = problems[0];
      if (!worst) {
        return <p className={`m-0 text-md font-semibold ${monitors.length ? TEXT_CLASS.OK : 'text-muted'}`}>{monitors.length ? t('settingsHub.preview.allClear') : t('settingsHub.preview.noMonitors')}</p>;
      }
      return (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={`text-md font-semibold ${TEXT_CLASS[worst.status]}`}>{t(`ui.status.${worst.status}`)}</span>
          <span className="truncate text-text">{safeText(worst.name)}</span>
        </div>
      );
    }
    case 'also-active':
      return <Rows monitors={problems.slice(1)} empty={2} />;
    case 'near-limit':
    case 'ranking':
      return <Rows monitors={sorted.filter((m) => m.value !== null)} empty={3} />;
    case 'matrix': {
      const cells: (Status | null)[] = monitors.length > 0 ? monitors.slice(0, 40).map((m) => m.status) : Array.from({ length: 12 }, () => null);
      return (
        <div aria-hidden="true" className="flex flex-wrap gap-1">
          {cells.map((status, i) => (
            <span key={i} className={`size-3 rounded-sm ${status ? DOT_CLASS[status] : 'bg-line-2'}`} />
          ))}
        </div>
      );
    }
    case 'value':
    case 'indicators':
      return first && first.value !== null ? (
        <span className="text-lg font-semibold text-text">
          <SafeValue value={first.value} className="font-mono" />
          {first.unit && <span className="ml-1 text-sm text-muted">{first.unit}</span>}
        </span>
      ) : (
        <span className="font-mono text-lg text-dim">—</span>
      );
    case 'series':
      return first?.series && first.series.length > 1 ? (
        <Sparkline values={first.series} status={first.status} className="h-8 w-full" />
      ) : (
        <span aria-hidden="true" className="block h-px w-full bg-line-2" />
      );
    case 'uptime': {
      const ok = monitors.filter((m) => m.status === 'OK').length;
      return <span className="font-mono text-lg text-text">{monitors.length ? `${Math.round((ok / monitors.length) * 1000) / 10}%` : '—'}</span>;
    }
    case 'clock':
      return <span className="font-mono text-lg text-text">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
    case 'text':
      return <p className="m-0 line-clamp-2 text-text">{text ? safeText(text) : t('settingsHub.blocks.text.description')}</p>;
    case 'timeline':
    case 'live-table':
    default:
      return <Rows monitors={sorted} empty={3} />;
  }
}
