import { describe, expect, it, vi } from 'vitest';
import { createFrameMonitor } from './frameMonitor';

/** Feeds frames `stepMs` apart for `durationMs`, starting at `from`. Returns the last timestamp. */
function feed(monitor: ReturnType<typeof createFrameMonitor>, from: number, stepMs: number, durationMs: number): number {
  let t = from;
  for (; t < from + durationMs; t += stepMs) monitor.sample(t);
  return t;
}

describe('FE-52 frame monitor', () => {
  it('downgrades once frame time stays above 20 ms for 3 s', () => {
    const onDowngrade = vi.fn();
    const monitor = createFrameMonitor({ onDowngrade });
    feed(monitor, 0, 33, 2_900);
    expect(onDowngrade).not.toHaveBeenCalled();
    feed(monitor, 2_900, 33, 1_000);
    expect(onDowngrade).toHaveBeenCalledTimes(1);
    feed(monitor, 3_900, 33, 5_000);
    expect(onDowngrade).toHaveBeenCalledTimes(1);
  });

  it('never downgrades at a steady 60 fps', () => {
    const onDowngrade = vi.fn();
    const monitor = createFrameMonitor({ onDowngrade });
    feed(monitor, 0, 16.7, 10_000);
    expect(onDowngrade).not.toHaveBeenCalled();
  });

  it('a short hitch does not count: slow frames must be sustained', () => {
    const onDowngrade = vi.fn();
    const monitor = createFrameMonitor({ onDowngrade });
    let t = 0;
    for (let i = 0; i < 6; i++) {
      t = feed(monitor, t, 40, 1_500);
      t = feed(monitor, t, 16.7, 1_500);
    }
    expect(onDowngrade).not.toHaveBeenCalled();
  });

  it('ignores gaps from a hidden tab', () => {
    const onDowngrade = vi.fn();
    const monitor = createFrameMonitor({ onDowngrade });
    monitor.sample(0);
    monitor.sample(5_000);
    monitor.sample(5_016);
    expect(onDowngrade).not.toHaveBeenCalled();
  });

  it('reset starts measuring again', () => {
    const onDowngrade = vi.fn();
    const monitor = createFrameMonitor({ onDowngrade });
    feed(monitor, 0, 33, 4_000);
    monitor.reset();
    feed(monitor, 10_000, 33, 4_000);
    expect(onDowngrade).toHaveBeenCalledTimes(2);
  });
});
