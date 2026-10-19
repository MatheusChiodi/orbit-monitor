import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { TimelineEvent, TimelineKind } from '@/shared/api/types';
import { formatClock } from '@/shared/format';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import { AnimatedItem, Panel } from '@/shared/ui';

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
        <p className="m-0 text-[0.85rem] text-muted">{t('wall.timeline.empty')}</p>
      ) : (
        <ol className="m-0 flex min-h-0 list-none flex-col gap-[0.2rem] overflow-hidden p-0">
          <AnimatePresence>
          {events.map((event, index) => (
            <AnimatedItem
              key={event.id}
              motionKind="reorder"
              index={index}
              count={events.length}
              data-kind={event.kind}
              className={`grid grid-cols-[auto_auto_1fr] items-start gap-x-[0.6rem] rounded-[0.4rem] px-[0.4rem] py-[0.35rem] ${animated && freshIds.has(event.id) ? 'anim-flash' : ''}`}
            >
              <time dateTime={event.at} className="font-mono text-[0.78rem] text-muted">
                {formatClock(event.at)}
              </time>
              <span
                data-dot
                role="img"
                aria-label={t(`wall.timeline.kind.${event.kind}`)}
                className={`mt-[0.32rem] size-[0.5rem] rounded-full ${DOT[event.kind]}`}
              />
              <span className="min-w-0">
                <SafeValue value={event.title} surface="wall" className="block text-[0.85rem] font-semibold" />
                {event.detail && (
                  <SafeValue value={event.detail} surface="wall" className="block font-mono text-[0.72rem] text-muted" />
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
