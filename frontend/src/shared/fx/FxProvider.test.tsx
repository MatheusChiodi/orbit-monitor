import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FxProvider, useFxLevel } from './FxProvider';

function Probe() {
  const fx = useFxLevel();
  return (
    <span data-testid="fx" data-level={fx.level} data-orb={String(fx.orb)} data-paused={String(fx.backgroundPaused)}>
      {fx.downgraded ? 'downgraded' : 'full'}
      <button type="button" onClick={fx.restore}>
        restore
      </button>
    </span>
  );
}

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('reduce') && matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.fx;
});

describe('FE-52 FxProvider / useFxLevel', () => {
  it('without a provider the level is standard', () => {
    render(<Probe />);
    expect(screen.getByTestId('fx')).toHaveAttribute('data-level', 'standard');
  });

  it('uses the given level and marks <html data-fx>', () => {
    render(
      <FxProvider level="expressive" monitorFrames={false}>
        <Probe />
      </FxProvider>,
    );
    expect(screen.getByTestId('fx')).toHaveAttribute('data-level', 'expressive');
    expect(document.documentElement.dataset.fx).toBe('expressive');
  });

  it('prefers-reduced-motion forces off', () => {
    mockReducedMotion(true);
    render(
      <FxProvider level="expressive" monitorFrames={false}>
        <Probe />
      </FxProvider>,
    );
    expect(screen.getByTestId('fx')).toHaveAttribute('data-level', 'off');
    expect(screen.getByTestId('fx')).toHaveAttribute('data-orb', 'false');
  });

  it('an unacknowledged incident pauses the background', () => {
    render(
      <FxProvider level="standard" incidentActive monitorFrames={false}>
        <Probe />
      </FxProvider>,
    );
    expect(screen.getByTestId('fx')).toHaveAttribute('data-paused', 'true');
  });

  it('sustained slow frames downgrade to minimal; restore brings the level back', () => {
    let tick: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      tick = cb;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    render(
      <FxProvider level="standard">
        <Probe />
      </FxProvider>,
    );
    act(() => {
      for (let t = 0; t < 4_000; t += 40) tick?.(t);
    });
    expect(screen.getByTestId('fx')).toHaveAttribute('data-level', 'minimal');
    expect(screen.getByText('downgraded')).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'restore' }).click());
    expect(screen.getByTestId('fx')).toHaveAttribute('data-level', 'standard');
  });

  it('does not measure frames when nothing animates', () => {
    const raf = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', raf);
    render(
      <FxProvider level="minimal">
        <Probe />
      </FxProvider>,
    );
    expect(raf).not.toHaveBeenCalled();
  });
});
