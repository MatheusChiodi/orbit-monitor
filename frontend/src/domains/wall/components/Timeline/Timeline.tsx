import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { TimelineEvent, TimelineKind } from '@/shared/api/types';
import { formatClock } from '@/shared/format';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import { AnimatedItem } from '@/shared/ui/AnimatedItem';
import { Panel } from '@/shared/ui/Panel';

export interface TimelineProps {
  events: readonly TimelineEvent[];
  freshIds: ReadonlySet<string>;
}

/** Acknowledgements come in blue (informational), not green. */
const DOT: Record<TimelineKind, string> = {
  DOWN: 'bg-down',
  WARN: 'bg-warn',
  OK: 'bg-ok',
  ACK: 'bg-info',
  INFO: 'bg-muted',
};

export function Timeline({ events, freshIds }: TimelineProps) {
  const { t } = useTranslation();
  const animated = useAnimationLevel() !== 'off';
  return (
    <Panel title={t('wall.timeline.title')} className="h-full">
      {events.length === 0 ? (
        <p className="m-0 text-base text-muted">{t('wall.timeline.empty')}</p>
      ) : (
        <ol className="m-0 flex min-h-0 list-none flex-col gap-0.5 overflow-hidden p-0">
          <AnimatePresence>
          {events.map((event, index) => (
            <AnimatedItem
              key={event.id}
              motionKind="reorder"
              index={index}
              count={events.length}
              data-kind={event.kind}
              className={`flex items-start gap-x-2 rounded-sm px-2 py-1 ${animated && freshIds.has(event.id) ? 'anim-flash' : ''}`}
            >
              <time dateTime={event.at} className="shrink-0 font-mono text-xs text-muted">
                {formatClock(event.at)}
              </time>
              <span
                data-dot
                role="img"
                aria-label={t(`wall.timeline.kind.${event.kind}`)}
                className={`mt-1 size-2 shrink-0 rounded-full ${DOT[event.kind]}`}
              />
              <span className="min-w-0 flex-1">
                <SafeValue value={event.title} surface="wall" className="block text-base font-semibold" />
                {event.detail && (
                  <SafeValue value={event.detail} surface="wall" className="block font-mono text-xs text-muted" />
                )}
              </span>
            </AnimatedItem>
          ))}
          </AnimatePresence>
        </ol>
      )}
    </Panel>
  );
}
