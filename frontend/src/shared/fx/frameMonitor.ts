export interface FrameMonitorOptions {
  onDowngrade: () => void;
  /** Frame time above this is "slow" (docs/03-design.md §4.2). */
  budgetMs?: number;
  /** How long frames must stay slow before downgrading. */
  windowMs?: number;
}

export interface FrameMonitor {
  /** Feed a `requestAnimationFrame` timestamp. */
  sample: (timestamp: number) => void;
  reset: () => void;
}

/** Gaps longer than this come from a hidden tab or a paused loop, not from slow rendering. */
const MAX_GAP_MS = 500;
const SMOOTHING = 0.1;

/**
 * Smooths frame time with an exponential moving average and fires `onDowngrade` once when it
 * stays above the budget for the whole window. A short hitch resets the clock.
 */
export function createFrameMonitor({ onDowngrade, budgetMs = 20, windowMs = 3_000 }: FrameMonitorOptions): FrameMonitor {
  let last: number | null = null;
  let average = 0;
  let slowSince: number | null = null;
  let fired = false;

  const reset = () => {
    last = null;
    average = 0;
    slowSince = null;
    fired = false;
  };

  const sample = (timestamp: number) => {
    if (fired) return;
    const delta = last === null ? null : timestamp - last;
    last = timestamp;
    if (delta === null || delta <= 0 || delta > MAX_GAP_MS) {
      slowSince = null;
      return;
    }
    average = average === 0 ? delta : average + (delta - average) * SMOOTHING;
    if (average <= budgetMs) {
      slowSince = null;
      return;
    }
    slowSince ??= timestamp;
    if (timestamp - slowSince >= windowMs) {
      fired = true;
      onDowngrade();
    }
  };

  return { sample, reset };
}
