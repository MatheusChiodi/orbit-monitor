import { useEffect, useRef, useState } from 'react';
import { useAnimationLevel } from './animationLevel';
import { MOTION } from './tokens';

export type FlashDirection = 'up' | 'down';

/**
 * Direction of the last value change, for 600 ms (the number itself swaps in place, never counts).
 * Never flashes when the animation level is off or the value is missing.
 */
export function useValueFlash(value: number | null | undefined): FlashDirection | null {
  const level = useAnimationLevel();
  const previous = useRef(value);
  const [flash, setFlash] = useState<{ direction: FlashDirection; id: number } | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = value;
    if (level === 'off' || typeof before !== 'number' || typeof value !== 'number' || before === value) return;
    setFlash((current) => ({ direction: value > before ? 'up' : 'down', id: (current?.id ?? 0) + 1 }));
  }, [value, level]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), MOTION.flashMs);
    return () => clearTimeout(timer);
  }, [flash]);

  return level === 'off' ? null : (flash?.direction ?? null);
}
