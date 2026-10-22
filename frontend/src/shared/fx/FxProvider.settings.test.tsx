import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AnimationLevelProvider } from '@/shared/motion/animationLevel';
import { settingsFor } from '@/shared/motion/motionSettings';
import { FxProvider, useFxLevel } from './FxProvider';
import { applyFxSettings, resolveFx } from './fxLevel';

function Probe() {
  const fx = useFxLevel();
  return <span data-testid="fx" data-background={fx.background} data-intros={String(fx.intros)} data-intensity={String(fx.intensity)} />;
}

afterEach(() => {
  delete document.documentElement.dataset.fx;
});

const base = (level: 'standard' | 'expressive' | 'minimal' | 'off') => resolveFx({ level, reducedMotion: false, incidentActive: false, downgraded: false });

describe('FE-06 → FE-52: the FX layer reads the animation settings', () => {
  it('background and intros switches act on their own; intensity comes from the settings', () => {
    expect(applyFxSettings(base('standard'), settingsFor('standard', { background: false }))).toMatchObject({ background: 'static', orb: true });
    expect(applyFxSettings(base('standard'), settingsFor('standard', { intros: true }))).toMatchObject({ intros: true });
    expect(applyFxSettings(base('expressive'), settingsFor('expressive', { intros: false }))).toMatchObject({ intros: false });
    expect(applyFxSettings(base('standard'), settingsFor('standard', { intensity: 30 })).intensity).toBeCloseTo(0.3);
  });

  it('switches never add effects the level (or reduced motion) turned off', () => {
    expect(applyFxSettings(base('off'), settingsFor('standard', { intros: true, background: true }))).toMatchObject({ intros: false, background: 'static', intensity: 0 });
    expect(applyFxSettings(base('minimal'), settingsFor('expressive')).intensity).toBeLessThanOrEqual(0.25);
  });

  it('the defaults of each preset keep the previous behavior', () => {
    for (const level of ['minimal', 'standard', 'expressive'] as const) {
      expect(applyFxSettings(base(level), settingsFor(level))).toEqual(base(level));
    }
  });

  it('FxProvider applies the settings from AnimationLevelProvider', () => {
    render(
      <AnimationLevelProvider level="standard" settings={settingsFor('standard', { background: false, intros: true, intensity: 40 })} prefersReducedMotion={false}>
        <FxProvider monitorFrames={false}>
          <Probe />
        </FxProvider>
      </AnimationLevelProvider>,
    );
    const probe = screen.getByTestId('fx');
    expect(probe).toHaveAttribute('data-background', 'static');
    expect(probe).toHaveAttribute('data-intros', 'true');
    expect(probe).toHaveAttribute('data-intensity', '0.4');
  });
});
