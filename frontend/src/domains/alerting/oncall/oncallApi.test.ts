import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOnCallApi, useOnCallNow, ONCALL_REFRESH_MS } from './oncallApi';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.useRealTimers());

describe('BE-33 who is on call now', () => {
  it('reads GET /api/oncall/now and drops malformed entries', async () => {
    const fetch = vi.fn(async () =>
      json(200, [
        { scheduleId: 's1', scheduleName: 'Payments', person: 'Ana', shiftEndsAt: '2026-10-22T18:00:00Z' },
        { scheduleId: 's2', person: 42 },
      ]),
    );
    expect(await createOnCallApi({ fetch }).now()).toEqual([
      { scheduleId: 's1', scheduleName: 'Payments', person: 'Ana', shiftEndsAt: '2026-10-22T18:00:00Z' },
    ]);
    expect(fetch).toHaveBeenCalledWith('/api/oncall/now', expect.anything());
  });

  it('also accepts the { items } envelope; no schedules (404) means nobody', async () => {
    const wrapped = createOnCallApi({ fetch: vi.fn(async () => json(200, { items: [{ scheduleId: 's', scheduleName: 'Ops', person: 'Rui', shiftEndsAt: null }] })) });
    expect(await wrapped.now()).toHaveLength(1);
    expect(await createOnCallApi({ fetch: vi.fn(async () => json(404, {})) }).now()).toEqual([]);
  });

  it('useOnCallNow loads only when enabled and refreshes periodically', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const load = vi.fn(async () => [{ scheduleId: 's', scheduleName: 'Ops', person: 'Rui', shiftEndsAt: null }]);
    const { result, rerender } = renderHook(({ on }) => useOnCallNow(load, on), { initialProps: { on: false } });
    expect(load).not.toHaveBeenCalled();
    rerender({ on: true });
    await waitFor(() => expect(result.current?.[0]?.person).toBe('Rui'));
    await act(async () => {
      vi.advanceTimersByTime(ONCALL_REFRESH_MS);
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('a failing load keeps "unknown" (null) instead of claiming nobody is on call', async () => {
    const load = vi.fn(async () => {
      throw new Error('offline');
    });
    const { result } = renderHook(() => useOnCallNow(load, true));
    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
