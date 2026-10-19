import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimationLevelProvider, type AnimationLevel } from './animationLevel';
import { useMotionPreset } from './useMotionPreset';
import { useValueFlash } from './useValueFlash';

function wrapper(level: AnimationLevel) {
  return ({ children }: { children: ReactNode }) => <AnimationLevelProvider level={level}>{children}</AnimationLevelProvider>;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('FE-51 useValueFlash (number swaps in place, tint flash in the direction color)', () => {
  it('no flash on the first value', () => {
    const { result } = renderHook(({ v }) => useValueFlash(v), { initialProps: { v: 10 }, wrapper: wrapper('standard') });
    expect(result.current).toBeNull();
  });

  it('flashes "up" or "down" for 600 ms when the value changes', () => {
    const { result, rerender } = renderHook(({ v }) => useValueFlash(v), {
      initialProps: { v: 10 as number | null },
      wrapper: wrapper('standard'),
    });
    rerender({ v: 12 });
    expect(result.current).toBe('up');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current).toBeNull();
    rerender({ v: 3 });
    expect(result.current).toBe('down');
  });

  it('never flashes when the animation level is off', () => {
    const { result, rerender } = renderHook(({ v }) => useValueFlash(v), {
      initialProps: { v: 10 },
      wrapper: wrapper('off'),
    });
    rerender({ v: 99 });
    expect(result.current).toBeNull();
  });

  it('null (no response) does not flash', () => {
    const { result, rerender } = renderHook(({ v }) => useValueFlash(v), {
      initialProps: { v: 10 as number | null },
      wrapper: wrapper('standard'),
    });
    rerender({ v: null });
    expect(result.current).toBeNull();
  });
});

describe('FE-51 useMotionPreset', () => {
  it('reads the effective level from the provider', () => {
    const { result } = renderHook(() => useMotionPreset('enter'), { wrapper: wrapper('off') });
    expect(result.current.initial).toBe(false);
    expect(result.current.level).toBe('off');
  });

  it('defaults to standard', () => {
    const { result } = renderHook(() => useMotionPreset('enter'));
    expect(result.current.level).toBe('standard');
    expect(result.current.initial).toMatchObject({ opacity: 0 });
  });
});
