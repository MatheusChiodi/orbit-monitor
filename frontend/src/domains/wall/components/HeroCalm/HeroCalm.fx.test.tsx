import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FxProvider, resetWebglProbe, type FxLevel } from '@/shared/fx';
import { HeroCalm } from './HeroCalm';

vi.mock('@/shared/fx/HeroOrb/OrbScene', () => ({
  OrbScene: () => <canvas data-testid="fx-orb-canvas" />,
}));

const now = new Date(2026, 9, 18, 17, 10, 0);

function renderCalm(level: FxLevel, webgl: boolean) {
  resetWebglProbe();
  if (webgl) {
    vi.stubGlobal('WebGLRenderingContext', class {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
  }
  return render(
    <FxProvider level={level} monitorFrames={false}>
      <HeroCalm uptime24h={99.97} lastRecoveryAt={null} nearLimitCount={3} now={now} />
    </FxProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetWebglProbe();
});

describe('FE-52 HeroCalm orb', () => {
  it('minimal: the flat 2D symbol, no 3D', async () => {
    renderCalm('minimal', true);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.getByTestId('hero-calm-symbol')).toBeInTheDocument();
    expect(screen.queryByTestId('fx-orb-canvas')).toBeNull();
  });

  it('standard with WebGL: the live orb, with every value outside the canvas', async () => {
    renderCalm('standard', true);
    const canvas = await screen.findByTestId('fx-orb-canvas');
    for (const text of ['All systems operational', '99.97%', '3 monitors']) {
      expect(canvas).not.toContainElement(screen.getByText(text));
      expect(screen.getByText(text).closest('[aria-hidden="true"]')).toBeNull();
    }
  });
});
