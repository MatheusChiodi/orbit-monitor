import { useTranslation } from 'react-i18next';
import type { Status } from '@/shared/api/types';
import { formatNumber } from '@/shared/format';
import { useLocale } from '@/shared/i18n/useLocale';
import { SafeValue } from '@/shared/privacy';
import { FlashValue } from '@/shared/ui/FlashValue';
import { STATUS_COLOR } from '../core/palette';
import { VizFrame } from '../core/VizFrame';
import { withUnit } from '../core/format';
import { markTransition, useVizLevel } from '../core/useVizLevel';
import { toStatus, type ModeProps } from '../types';

/** Lamp order top to bottom; position also carries the state, not only color. */
const LAMPS: Status[] = ['DOWN', 'WARN', 'OK'];

/** Mode 15: traffic light, only "is it OK". */
export function TrafficLight({ data, animation, className }: ModeProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const level = useVizLevel(animation);
  const status = toStatus(data.status);
  const value = data.value;
  return (
    <VizFrame mode="traffic-light" level={level} label={data.label} status={data.status} empty={value === null} className={className}>
      <div className="flex items-center gap-[1rem]">
        <div role="img" aria-label={t(`status.label.${status}`)} className="flex flex-col gap-[0.3rem] rounded-[0.6rem] bg-bg p-[0.4rem]">
          {LAMPS.map((lamp) => (
            <span
              key={lamp}
              data-lamp={lamp}
              data-on={lamp === status ? 'true' : undefined}
              className={`block size-[1.1rem] rounded-full ${markTransition(level)}`}
              style={{ background: STATUS_COLOR[lamp], opacity: lamp === status ? 1 : 0.14 }}
            />
          ))}
        </div>
        {value !== undefined && (
          <FlashValue value={typeof value === 'number' ? value : null} className="font-mono text-[1.15rem] font-semibold tabular-nums">
            <SafeValue value={value} format={(v) => (typeof v === 'number' ? withUnit(formatNumber(v, locale), data.unit) : String(v))} />
          </FlashValue>
        )}
      </div>
    </VizFrame>
  );
}
