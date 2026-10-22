import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { nearLimit } from '@/domains/monitor/status';
import type { OnCallNow } from '@/domains/alerting/oncall/oncallApi';
import type { LayoutBlock } from '@/domains/workspace/layout/grid';
import type { MonitorView, WallSnapshot } from '@/shared/api/types';
import type { CardAction } from '@/shared/customization/definitions/cards';
import { formatPercent } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import { safeText } from '@/shared/privacy/redact';
import { formatReading } from '@/domains/monitor/rules';
import { alsoActive, groupRows, type HeroSelection } from '../../selectors';
import { orderedBlocks } from '../../layout/wallLayout';
import { AlsoActive } from '../AlsoActive';
import { ClockBlock } from '../ClockBlock';
import { HeroSwap } from '../HeroSwap';
import { IndicatorsBlock } from '../IndicatorsBlock';
import { MetricBlock } from '../MetricBlock';
import { MonitorMatrix } from '../MonitorMatrix';
import { MonitorTable } from '../MonitorTable';
import { NearLimit } from '../NearLimit';
import { SeriesBlock, type LoadHistory } from '../SeriesBlock';
import { TextBlock } from '../TextBlock';
import { Timeline } from '../Timeline';

export interface LayoutGridProps {
  blocks: readonly LayoutBlock[];
  snapshot: WallSnapshot;
  hero: HeroSelection | null;
  now: Date;
  freshEventIds: ReadonlySet<string>;
  onAcknowledge: (incidentId: string) => void;
  nextStep?: string | null;
  onCall?: readonly OnCallNow[] | null;
  loadHistory?: LoadHistory;
  /** FE-55 card actions of matrix tiles. */
  onMonitorAction?: (action: CardAction, monitorId: string) => void;
}

/** Monitors a block shows: its source monitor or group, or every monitor. */
function monitorsFor(block: LayoutBlock, monitors: readonly MonitorView[]): MonitorView[] {
  if (!block.source) return [...monitors];
  return monitors.filter((m) => m.id === block.source || m.groupId === block.source);
}

/**
 * FE-11: a saved wall layout on the 12-column grid (≥ 1100 px and wider than 4:3); on smaller screens
 * the blocks stack in reading order (top to bottom, left to right).
 */
export function LayoutGrid({ blocks, snapshot, hero, now, freshEventIds, onAcknowledge, nextStep, onCall = null, loadHistory, onMonitorAction }: LayoutGridProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const rows = Math.max(1, ...blocks.map((b) => b.y + b.h));
  const unowned = new Set(snapshot.incidents.filter((i) => !i.acknowledgedBy).map((i) => i.monitorId));

  function content(block: LayoutBlock): ReactNode {
    const monitors = monitorsFor(block, snapshot.monitors);
    switch (block.kind) {
      case 'hero':
        return (
          <div className="wall-hero h-full">
            <HeroSwap snapshot={snapshot} hero={hero} now={now} onAcknowledge={onAcknowledge} nextStep={nextStep} />
          </div>
        );
      case 'also-active':
        return <AlsoActive monitors={alsoActive(snapshot, hero?.monitor.id ?? null)} groups={snapshot.groups} now={now} />;
      case 'near-limit':
        return <NearLimit items={nearLimit(monitors)} />;
      case 'ranking':
        return <NearLimit items={nearLimit(monitors, 10)} title={t('wall.blocks.ranking')} />;
      case 'matrix':
        return <MonitorMatrix rows={groupRows({ ...snapshot, monitors })} unownedMonitorIds={unowned} onMonitorAction={onMonitorAction} />;
      case 'timeline':
        return <Timeline events={snapshot.timeline} freshIds={freshEventIds} />;
      case 'clock':
        return <ClockBlock now={now} onCall={onCall} />;
      case 'uptime':
        return (
          <MetricBlock title={t('wall.blocks.uptime')} value={snapshot.uptime24h}>
            {formatPercent(snapshot.uptime24h, 2, locale)}
          </MetricBlock>
        );
      case 'value': {
        const monitor = monitors[0];
        return (
          <MetricBlock title={monitor ? safeText(monitor.name, undefined, { surface: 'wall' }) : t('wall.blocks.value')} value={monitor?.value ?? null} status={monitor?.status}>
            {monitor ? formatReading(monitor.value, monitor.unit, locale) : t('wall.blocks.monitorMissing')}
          </MetricBlock>
        );
      }
      case 'series':
        return <SeriesBlock monitor={monitors[0]} range={block.range} loadHistory={loadHistory} now={now} />;
      case 'indicators':
        return <IndicatorsBlock monitors={monitors} />;
      case 'live-table':
        return <MonitorTable monitors={monitors} />;
      case 'text':
        return <TextBlock text={block.text} />;
    }
  }

  return (
    <main className="wall-grid" style={{ '--wall-rows': rows } as CSSProperties}>
      {orderedBlocks(blocks).map((block) => (
        <div
          key={block.id}
          data-block={block.kind}
          className="wall-block"
          style={{ '--block-col': `${block.x + 1} / span ${block.w}`, '--block-row': `${block.y + 1} / span ${block.h}` } as CSSProperties}
        >
          {content(block)}
        </div>
      ))}
    </main>
  );
}
