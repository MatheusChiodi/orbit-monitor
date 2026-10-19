import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FxProvider } from '../FxProvider';
import type { FxLevel } from '../fxLevel';
import { HeroOrb, resetWebglProbe } from './HeroOrb';

const sceneLoaded = vi.fn();

vi.mock('./OrbScene', () => ({
  OrbScene: ({ intensity }: { intensity: number }) => {
    sceneLoaded();
    return <canvas data-testid="fx-orb-canvas" data-intensity={intensity} aria-hidden="true" />;
  },
}));

function withWebgl(available: boolean) {
  resetWebglProbe();
  if (available) {
    vi.stubGlobal('WebGLRenderingContext', class {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
  }
}

function renderOrb(level: FxLevel) {
  return render(
    <FxProvider level={level} monitorFrames={false}>
      <div>
        <HeroOrb fallback={<span data-testid="orb-2d" />} />
        <h3>All systems operational</h3>
        <dd>99.98%</dd>
      </div>
    </FxProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sceneLoaded.mockClear();
  resetWebglProbe();
});

// Resolve the lazy chunk once up front, so no test depends on how fast a dynamic import is under load.
beforeAll(async () => {
  await import('./OrbScene');
}, 30_000);

describe('FE-52 HeroOrb', () => {
  it('off and minimal: keeps the 2D symbol and never loads the 3D scene', async () => {
    withWebgl(true);
    for (const level of ['off', 'minimal'] as const) {
      const { unmount } = renderOrb(level);
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(screen.getByTestId('orb-2d')).toBeInTheDocument();
      expect(screen.queryByTestId('fx-orb-canvas')).toBeNull();
      unmount();
    }
    expect(sceneLoaded).not.toHaveBeenCalled();
  });

  it('without WebGL: 2D fallback even at expressive', async () => {
    withWebgl(false);
    renderOrb('expressive');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.getByTestId('orb-2d')).toBeInTheDocument();
    expect(sceneLoaded).not.toHaveBeenCalled();
  });

  it('standard with WebGL: shows the 2D symbol first, then the live orb', async () => {
    withWebgl(true);
    renderOrb('standard');
    expect(screen.getByTestId('orb-2d')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('fx-orb-canvas')).toBeInTheDocument());
    expect(screen.queryByTestId('orb-2d')).toBeNull();
    expect(screen.getByTestId('fx-orb-canvas')).toHaveAttribute('data-intensity', '0.6');
  });

  it('values and labels never live inside the 3D canvas', async () => {
    withWebgl(true);
    renderOrb('expressive');
    const canvas = await screen.findByTestId('fx-orb-canvas');
    expect(canvas.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(canvas).not.toContainElement(screen.getByText('99.98%'));
    expect(canvas).not.toContainElement(screen.getByText('All systems operational'));
    expect(canvas.textContent).toBe('');
  });
});
