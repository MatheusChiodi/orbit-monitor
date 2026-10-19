import { SafeValue } from '@/shared/privacy';
import { DOT_CLASS, SOFT_CLASS, TEXT_CLASS, type Tone } from '@/shared/ui/tones';
import { VizFrame } from '../core/VizFrame';
import { markTransition, useVizLevel } from '../core/useVizLevel';
import { isStatus, type ModeProps } from '../types';

/** Tone of a text value through the operator's mapping (`"UP"` → OK); unmapped text stays neutral. */
export function mappedTone(value: unknown, mapping: Record<string, string> = {}): Tone {
  if (typeof value !== 'string' && typeof value !== 'number') return 'neutral';
  const target = mapping[String(value)];
  return isStatus(target) ? target : 'neutral';
}

/** Mode 16: status pill, a text field mapped to colors. */
export function TextStatus({ data, animation, className }: ModeProps) {
  const level = useVizLevel(animation);
  const value = data.value ?? null;
  const tone = mappedTone(value, data.mapping);
  return (
    <VizFrame mode="status-pill" level={level} label={data.label} status={data.status} empty={value === null} className={className}>
      <span
        data-status={tone}
        className={`inline-flex w-fit items-center gap-[0.5rem] rounded-full border px-[0.9rem] py-[0.35rem] font-mono text-[1rem] font-semibold tabular-nums ${SOFT_CLASS[tone]} ${TEXT_CLASS[tone]} ${markTransition(level)}`}
      >
        <span aria-hidden className={`size-[0.6rem] rounded-full ${DOT_CLASS[tone]}`} />
        <SafeValue value={value} />
      </span>
    </VizFrame>
  );
}
