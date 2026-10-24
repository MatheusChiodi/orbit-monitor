import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dismissAllToasts, ToastViewport } from '@/shared/ui';
import { FxProvider } from '../FxProvider';
import { FxDowngradeNotice } from './FxDowngradeNotice';

let tick: FrameRequestCallback | null = null;

function renderSlow() {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    tick = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const view = render(
    <FxProvider level="expressive">
      <FxDowngradeNotice />
      <ToastViewport />
    </FxProvider>,
  );
  act(() => {
    for (let t = 0; t < 4_000; t += 40) tick?.(t);
  });
  return view;
}

afterEach(() => {
  vi.unstubAllGlobals();
  act(() => dismissAllToasts());
  localStorage.clear();
  delete document.documentElement.dataset.fx;
});

describe('FE-52 FxDowngradeNotice', () => {
  it('stays hidden while frames are fine', () => {
    render(
      <FxProvider level="expressive" monitorFrames={false}>
        <FxDowngradeNotice />
        <ToastViewport />
      </FxProvider>,
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('after the first downgrade on this device shows one small toast, not a panel of its own', () => {
    renderSlow();
    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent('Effects were simplified to keep the screen smooth.');
    expect(toast).toHaveClass('ui-toast');
    expect(screen.queryByRole('button', { name: 'Keep simplified' })).toBeNull();
  });

  it('dismisses itself after a few seconds', () => {
    vi.useFakeTimers();
    try {
      renderSlow();
      expect(screen.getByRole('status')).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(9_000));
      expect(screen.queryByRole('status')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('is shown once per device: the next load starts simplified, silently', () => {
    const first = renderSlow();
    act(() => dismissAllToasts());
    first.unmount();
    render(
      <FxProvider level="expressive">
        <FxDowngradeNotice />
        <ToastViewport />
      </FxProvider>,
    );
    expect(document.documentElement.dataset.fx).toBe('minimal');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('"Restore effects" brings the effects back and forgets the downgrade', async () => {
    renderSlow();
    await userEvent.click(screen.getByRole('button', { name: 'Restore effects' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.documentElement.dataset.fx).toBe('expressive');
    expect(localStorage.getItem('orbit.fx.downgraded')).toBeNull();
  });
});
