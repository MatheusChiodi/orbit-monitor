import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FxProvider } from '../FxProvider';
import { FxDowngradeNotice } from './FxDowngradeNotice';

let tick: FrameRequestCallback | null = null;

function renderSlow() {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    tick = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  render(
    <FxProvider level="expressive">
      <FxDowngradeNotice />
    </FxProvider>,
  );
  act(() => {
    for (let t = 0; t < 4_000; t += 40) tick?.(t);
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('FE-52 FxDowngradeNotice', () => {
  it('stays hidden while frames are fine', () => {
    render(
      <FxProvider level="expressive" monitorFrames={false}>
        <FxDowngradeNotice />
      </FxProvider>,
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('after a downgrade offers "Keep simplified" and "Try again"', async () => {
    renderSlow();
    expect(screen.getByRole('status')).toHaveTextContent('Effects were simplified to keep the screen smooth.');
    await userEvent.click(screen.getByRole('button', { name: 'Keep simplified' }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('"Try again" restores the effects', async () => {
    renderSlow();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.documentElement.dataset.fx).toBe('expressive');
  });
});
