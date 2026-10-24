import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { formatReading, ruleText } from '@/domains/monitor/rules';
import type { NearLimitItem } from '@/domains/monitor/status';
import { currentLocale } from '@/shared/i18n/i18n';
import { safeText } from '@/shared/privacy/redact';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { AnimatedItem } from '@/shared/ui/AnimatedItem';
import { FlashValue } from '@/shared/ui/FlashValue';
import { Panel } from '@/shared/ui/Panel';

export interface NearLimitProps {
  items: readonly NearLimitItem[];
  /** Defaults to "Near threshold"; the ranking block reuses this list with its own title. */
  title?: string;
  /** Why the list is empty: no numeric limit yet (default), or limits waiting for their first reading. */
  empty?: 'no-rule' | 'waiting';
}

/** Below 25% headroom the bar turns amber. */
const LOW_HEADROOM = 0.25;

export function NearLimit({ items, title, empty = 'no-rule' }: NearLimitProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  return (
    <Panel title={title ?? t('wall.nearLimit.title')}>
      {items.length === 0 ? (
        empty === 'waiting' ? (
          <p className="m-0 text-base text-muted">{t('wall.nearLimit.waiting')}</p>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="m-0 text-base text-muted">{t('wall.nearLimit.empty')}</p>
            <p className="m-0 text-sm text-dim">{t('wall.nearLimit.emptyHint')}</p>
          </div>
        )
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          <AnimatePresence>
          {items.map(({ monitor, headroom }, index) => {
            const pct = Math.max(0, Math.min(100, Math.round(headroom * 100)));
            const tone = headroom < LOW_HEADROOM ? 'WARN' : 'OK';
            const rule = monitor.rule ? t('rule.text', { rule: ruleText(monitor.rule, locale) }) : '';
            return (
              <AnimatedItem
                key={monitor.id}
                motionKind="reorder"
                index={index}
                count={items.length}
                className="flex items-center gap-3"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <SafeValue value={monitor.name} surface="wall" className="truncate text-base font-semibold" />
                  <span
                    role="meter"
                    aria-label={t('wall.nearLimit.headroomOf', { name: safeText(monitor.name, undefined, { surface: 'wall' }) })}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    className="block h-1.5 overflow-hidden rounded-full bg-s3"
                  >
                    <span
                      data-fill={tone}
                      className={`block h-full rounded-full ${tone === 'WARN' ? 'bg-warn' : 'bg-ok'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="truncate font-mono text-xs text-muted">
                    {`${formatReading(monitor.value, monitor.unit, locale)} · ${rule}`}
                  </span>
                </span>
                <FlashValue
                  value={pct}
                  className={`display-wide tabular shrink-0 text-xl ${tone === 'WARN' ? 'text-warn-text' : 'text-ok-text'}`}
                >
                  {`${pct}%`}
                </FlashValue>
              </AnimatedItem>
            );
          })}
          </AnimatePresence>
        </ul>
      )}
    </Panel>
  );
}
