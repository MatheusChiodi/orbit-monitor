import type { KeyboardEvent } from 'react';

export type Orientation = 'horizontal' | 'vertical' | 'both';

/**
 * Next index for arrow/Home/End keys in a roving-focus group (radiogroup, tablist, menu); wraps and
 * skips disabled items. Returns null when the key does not move.
 */
export function nextRovingIndex(
  event: Pick<KeyboardEvent, 'key'>,
  current: number,
  disabled: readonly boolean[],
  orientation: Orientation = 'horizontal',
): number | null {
  const count = disabled.length;
  if (count === 0) return null;
  const forward = orientation === 'vertical' ? ['ArrowDown'] : orientation === 'horizontal' ? ['ArrowRight'] : ['ArrowRight', 'ArrowDown'];
  const back = orientation === 'vertical' ? ['ArrowUp'] : orientation === 'horizontal' ? ['ArrowLeft'] : ['ArrowLeft', 'ArrowUp'];
  const find = (start: number, step: number): number | null => {
    for (let i = 0; i < count; i++) {
      const index = (((start + step * i) % count) + count) % count;
      if (!disabled[index]) return index;
    }
    return null;
  };
  if (forward.includes(event.key)) return find(current + 1, 1);
  if (back.includes(event.key)) return find(current - 1, -1);
  if (event.key === 'Home') return find(0, 1);
  if (event.key === 'End') return find(count - 1, -1);
  return null;
}
