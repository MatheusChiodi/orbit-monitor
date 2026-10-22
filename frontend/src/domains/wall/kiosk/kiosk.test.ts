import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CURSOR_IDLE_MS, useKiosk } from './kiosk';
import { isKioskRequested } from './kioskRequest';

let release: ReturnType<typeof vi.fn>;
let request: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  release = vi.fn().mockResolvedValue(undefined);
  request = vi.fn().mockResolvedValue({ release, addEventListener: vi.fn() });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  document.documentElement.requestFullscreen = vi.fn().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.classList.remove('kiosk-cursor-hidden');
});

describe('FE-45 kiosk mode', () => {
  it('is requested with ?kiosk=1', () => {
    expect(isKioskRequested('?kiosk=1')).toBe(true);
    expect(isKioskRequested('?kiosk=0')).toBe(false);
    expect(isKioskRequested('')).toBe(false);
  });

  it('enter() goes fullscreen and holds a screen wake lock', async () => {
    const { result } = renderHook(() => useKiosk());
    await act(() => result.current.enter());
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith('screen');
    expect(result.current.active).toBe(true);
  });

  it('re-acquires the wake lock when the page becomes visible again', async () => {
    const { result } = renderHook(() => useKiosk());
    await act(() => result.current.enter());
    request.mockClear();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(request).toHaveBeenCalledWith('screen');
  });

  it('hides the cursor after it stays still and shows it again on movement', async () => {
    const { result } = renderHook(() => useKiosk());
    await act(() => result.current.enter());
    act(() => {
      vi.advanceTimersByTime(CURSOR_IDLE_MS);
    });
    expect(document.documentElement.classList.contains('kiosk-cursor-hidden')).toBe(true);
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });
    expect(document.documentElement.classList.contains('kiosk-cursor-hidden')).toBe(false);
  });

  it('exit() releases the wake lock', async () => {
    const { result } = renderHook(() => useKiosk());
    await act(() => result.current.enter());
    await act(() => result.current.exit());
    expect(release).toHaveBeenCalled();
    expect(result.current.active).toBe(false);
  });

  it('works without the Wake Lock API (older TVs)', async () => {
    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
    const { result } = renderHook(() => useKiosk());
    await act(() => result.current.enter());
    expect(result.current.active).toBe(true);
    expect(result.current.wakeLock).toBe(false);
  });
});
