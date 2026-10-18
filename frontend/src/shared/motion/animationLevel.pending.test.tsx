import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ANIMATION_LEVELS,
  AnimationLevelProvider,
  effectiveAnimationLevel,
  transitionFor,
  useAnimationLevel,
} from './animationLevel';

function Probe() {
  const level = useAnimationLevel();
  return <span>{level}</span>;
}

describe('FE-06 animation level', () => {
  it('has off, minimal, standard (default) and expressive', () => {
    expect(ANIMATION_LEVELS).toEqual(['off', 'minimal', 'standard', 'expressive']);
  });

  it('prefers-reduced-motion is a hard ceiling that forces off', () => {
    for (const level of ANIMATION_LEVELS) expect(effectiveAnimationLevel(level, true)).toBe('off');
    expect(effectiveAnimationLevel('expressive', false)).toBe('expressive');
  });

  it('off has no duration; minimal only fades; never a spring; displacement <= 8 px', () => {
    expect(transitionFor('off', 'hero')).toEqual({ duration: 0 });
    expect(transitionFor('minimal', 'hero')).toMatchObject({ duration: expect.any(Number) });
    for (const level of ANIMATION_LEVELS) {
      const t = transitionFor(level, 'hero');
      expect(t).not.toHaveProperty('type', 'spring');
      expect(Math.abs(t.y ?? 0)).toBeLessThanOrEqual(8);
    }
  });

  it('standard keeps the 350 ms hero swap from docs/03-design.md', () => {
    expect(transitionFor('standard', 'hero').duration).toBeCloseTo(0.35);
  });

  it('the provider exposes the effective level and marks <html data-animation>', () => {
    render(
      <AnimationLevelProvider level="expressive" prefersReducedMotion>
        <Probe />
      </AnimationLevelProvider>,
    );
    expect(screen.getByText('off')).toBeInTheDocument();
    expect(document.documentElement.dataset.animation).toBe('off');
  });

  it('without a provider the level is standard', () => {
    render(<Probe />);
    expect(screen.getByText('standard')).toBeInTheDocument();
  });
});
