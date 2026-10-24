import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { formatReading } from '@/domains/monitor/rules';
import type { MonitorView } from '@/shared/api/types';
import { CardIcon } from '@/shared/customization/CardIcon';
import { CustomizeHandle } from '@/shared/customization/CustomizeHandle';
import { formatCardValue, useCardInteractions, useMonitorCardSettings } from '@/shared/customization/cards';
import type { CardAction } from '@/shared/customization/definitions/cards';
import { currentLocale } from '@/shared/i18n/i18n';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import { safeText } from '@/shared/privacy/redact';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { AnimatedItem } from '@/shared/ui/AnimatedItem';
import { FlashValue } from '@/shared/ui/FlashValue';
import { Panel } from '@/shared/ui/Panel';
import { StatusDot } from '@/shared/ui/StatusPill';
import { SOFT_CLASS, TEXT_CLASS } from '@/shared/ui/tones';
import type { GroupRow } from '../../selectors';

export interface MonitorMatrixProps {
  rows: readonly GroupRow[];
  /** Down monitors without an owner blink softly. */
  unownedMonitorIds: ReadonlySet<string>;
  /** FE-55: card actions the host supports (`open-detail`, `acknowledge`, `open-target`). */
  onMonitorAction?: (action: CardAction, monitorId: string) => void;
}

const CELL_SIZE = { compact: 'px-2 py-0.5', regular: 'px-2 py-1', detailed: 'px-3 py-2' } as const;

/** Tiles fill the row at a readable minimum width instead of a fixed 3 columns. */
const TILE_GRID = { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 10.5rem), 1fr))' } as const;

interface MonitorCellProps {
  monitor: MonitorView;
  index: number;
  count: number;
  blink: boolean;
  colors: string;
  onMonitorAction?: MonitorMatrixProps['onMonitorAction'];
}

/** One tile; size, fields, title, tint and actions come from the FE-55 card settings. */
function MonitorCell({ monitor: m, index, count, blink, colors, onMonitorAction }: MonitorCellProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const card = useMonitorCardSettings(m.id);
  const [expanded, setExpanded] = useState(false);
  const host = (action: CardAction) => (onMonitorAction ? () => onMonitorAction(action, m.id) : undefined);
  const interactions = useCardInteractions(card, {
    'open-detail': host('open-detail'),
    acknowledge: host('acknowledge'),
    'open-target': host('open-target'),
    expand: card.expand === 'inline' ? () => setExpanded((e) => !e) : undefined,
  });
  const tinted = card.colorBands && m.status !== 'OK';
  const surface = tinted ? SOFT_CLASS[m.status] : 'bg-s2 border-line';
  const name = card.title || m.name;
  const hover = card.hover === 'highlight' && interactions.role ? 'hover:brightness-125' : '';
  return (
    <AnimatedItem
      motionKind="reorder"
      index={index}
      count={count}
      data-status={m.status}
      data-variant={card.variant}
      data-customizable="card.monitor"
      className={`flex min-w-0 flex-wrap items-start gap-x-2 gap-y-0.5 rounded-sm border ${CELL_SIZE[card.variant]} ${colors} ${surface} ${hover} ${blink ? 'anim-blink' : ''}`}
    >
      <StatusDot status={m.status} className="mt-1" />
      {/* Names wrap to two lines instead of being cut to "Rec…"; the full name stays in the title. */}
      <span
        {...interactions}
        aria-expanded={interactions.role && card.expand === 'inline' ? expanded : undefined}
        className={`line-clamp-2 min-w-0 flex-1 leading-snug break-words ${card.variant === 'detailed' ? 'text-base' : 'text-sm'}`}
        title={card.hover === 'none' ? undefined : safeText(name, undefined, { surface: 'wall' })}
      >
        <CardIcon icon={card.icon} />
        <SafeValue value={name} surface="wall" />
      </span>
      <CustomizeHandle type="card.monitor" targetId={m.id} label={safeText(name, undefined, { surface: 'wall' })} />
      <span className="flex shrink-0 flex-col items-end leading-snug">
        {card.fields.includes('value') && (
          <FlashValue value={m.value} className="font-mono text-xs text-muted">
            {formatCardValue(m.value, card.unit || m.unit, locale, card.valueFormat)}
          </FlashValue>
        )}
        {m.status !== 'OK' && (
          <span className={`font-mono text-xs font-semibold ${TEXT_CLASS[m.status]} ${card.variant === 'compact' ? 'sr-only' : ''}`}>{t(`status.label.${m.status}`)}</span>
        )}
      </span>
      {(card.subtitle || expanded) && (
        <span className="w-full truncate text-xs text-muted">
          {card.subtitle && <SafeValue value={card.subtitle} surface="wall" />}
          {expanded && ` ${m.type} · ${formatReading(m.value, m.unit, locale)}`}
        </span>
      )}
    </AnimatedItem>
  );
}

export function MonitorMatrix({ rows, unownedMonitorIds, onMonitorAction }: MonitorMatrixProps) {
  const { t } = useTranslation();
  const colors = useAnimationLevel() === 'off' ? 'transition-none' : 'transition-colors duration-400';
  return (
    <Panel title={t('wall.matrix.title')} className="h-full">
      <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
        {rows.map((row) => {
          const { ok, total, status } = row.summary;
          const summary = t('status.groupSummary', { ok, total });
          return (
            <div
              key={row.group.id}
              role="group"
              aria-label={safeText(row.group.name, undefined, { surface: 'wall' })}
              className="flex flex-col gap-2 md:flex-row"
            >
              <div className="flex flex-col justify-center md:w-32 md:shrink-0">
                <span title={safeText(row.group.name, undefined, { surface: 'wall' })} className="line-clamp-2 text-base leading-snug font-semibold break-words">
                  <SafeValue value={row.group.name} surface="wall" />
                </span>
                <span className={`font-mono text-xs whitespace-nowrap ${status === 'OK' ? 'text-muted' : TEXT_CLASS[status]}`}>
                  {status === 'OK' ? summary : `${summary} · ${t(`status.label.${status}`)}`}
                </span>
              </div>
              <ul className="m-0 grid min-w-0 flex-1 list-none gap-2 p-0" style={TILE_GRID}>
                <AnimatePresence>
                {row.monitors.map((m, index) => (
                  <MonitorCell
                    key={m.id}
                    monitor={m}
                    index={index}
                    count={row.monitors.length}
                    blink={m.status === 'DOWN' && unownedMonitorIds.has(m.id)}
                    colors={colors}
                    onMonitorAction={onMonitorAction}
                  />
                ))}
                </AnimatePresence>
              </ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
