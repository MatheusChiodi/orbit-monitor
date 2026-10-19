import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FxProvider } from '../FxProvider';
import type { FxLevel } from '../fxLevel';
import { FxBackground } from './FxBackground';

function renderBackground(level: FxLevel, incidentActive = false) {
  return render(
    <FxProvider level={level} incidentActive={incidentActive} monitorFrames={false}>
      <FxBackground />
      <p>QTY = 347</p>
    </FxProvider>,
  );
}

const context = {
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  ellipse: vi.fn(),
  arc: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  fillText: vi.fn(),
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Lets the deferred mount (after first paint) and the lazy chunk resolve. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

describe('FE-52 FxBackground', () => {
  it('off and minimal: static gradient only, no particles canvas', async () => {
    for (const level of ['off', 'minimal'] as const) {
      const { container, unmount } = renderBackground(level);
      await settle();
      expect(container.querySelector('.fx-backdrop')).not.toBeNull();
      expect(screen.queryByTestId('fx-orbit-field')).toBeNull();
      unmount();
    }
  });

  it('standard: mounts the orbit field after first paint, hidden from assistive tech', async () => {
    const { container } = renderBackground('standard');
    expect(screen.queryByTestId('fx-orbit-field')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('fx-orbit-field')).toBeInTheDocument());
    const backdrop = container.querySelector('.fx-backdrop');
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(backdrop?.textContent).toBe('');
  });

  it('data never lives inside the background: no text is drawn and values stay in the DOM', async () => {
    renderBackground('expressive');
    await waitFor(() => expect(screen.getByTestId('fx-orbit-field')).toBeInTheDocument());
    expect(context.fillText).not.toHaveBeenCalled();
    expect(screen.getByTestId('fx-orbit-field')).not.toContainElement(screen.getByText('QTY = 347'));
  });

  it('an unacknowledged incident pauses it: one frame, no animation loop', async () => {
    const raf = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', raf);
    const { container } = renderBackground('standard', true);
    await waitFor(() => expect(screen.getByTestId('fx-orbit-field')).toBeInTheDocument());
    expect(container.querySelector('.fx-backdrop')).toHaveAttribute('data-paused', 'true');
    expect(raf).not.toHaveBeenCalled();
    expect(context.ellipse).toHaveBeenCalled();
  });

  it('runs the loop when nothing is wrong', async () => {
    const raf = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', raf);
    renderBackground('standard');
    await waitFor(() => expect(screen.getByTestId('fx-orbit-field')).toBeInTheDocument());
    expect(raf).toHaveBeenCalled();
  });
});
