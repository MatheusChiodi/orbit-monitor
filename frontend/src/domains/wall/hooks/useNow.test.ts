import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from './useNow';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 18, 17, 0, 0));
});
afterEach(() => vi.useRealTimers());

describe('useNow', () => {
  it('updates on every interval', () => {
    const { result } = renderHook(() => useNow(1000));
    expect(result.current.getSeconds()).toBe(0);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.getSeconds()).toBe(3);
  });

  it('stops the timer on unmount', () => {
    const { unmount } = renderHook(() => useNow(1000));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
