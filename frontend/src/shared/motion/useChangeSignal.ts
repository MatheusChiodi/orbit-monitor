import { useEffect, useRef, useState } from 'react';

/**
 * True for `durationMs` after `value` changes (never on the first render, never when disabled).
 * Drives one-shot signals such as the status dot pulse or the sparkline's new-point draw.
 */
export function useChangeSignal(value: unknown, enabled: boolean, durationMs: number): boolean {
  const previous = useRef(value);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const changed = !Object.is(previous.current, value);
    previous.current = value;
    if (changed && enabled) setActive((n) => (n ?? 0) + 1);
  }, [value, enabled]);

  useEffect(() => {
    if (active === null) return;
    const timer = setTimeout(() => setActive(null), durationMs);
    return () => clearTimeout(timer);
  }, [active, durationMs]);

  return enabled && active !== null;
}
