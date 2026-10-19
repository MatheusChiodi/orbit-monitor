import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Rule } from '@/shared/api/types';
import { renderWithMotion } from '@/test/motion';
import { ThresholdChart } from './ThresholdChart';

const rule: Rule = { field: 'QTY', operator: '<', limit: 200 };

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

function wrapper(container: HTMLElement) {
  return container.querySelector('[data-motion-level]') as HTMLElement;
}

describe('FE-51 ThresholdChart motion', () => {
  it('crossing the limit marks the wrapper as violated', () => {
    const { container, rerender } = renderWithMotion(<ThresholdChart series={[100, 150]} rule={rule} status="OK" />, 'standard');
    expect(wrapper(container)).toHaveAttribute('data-violated', 'false');
    rerender(<ThresholdChart series={[100, 150, 349]} rule={rule} status="DOWN" />);
    expect(wrapper(container)).toHaveAttribute('data-violated', 'true');
  });

  it('standard: the threshold area fades in with a transition class', () => {
    const { container } = renderWithMotion(<ThresholdChart series={[349]} rule={rule} status="DOWN" />, 'standard');
    expect(wrapper(container).className).toMatch(/transition/);
    expect(wrapper(container).className).not.toContain('transition-none');
  });

  it('off: no transition class', () => {
    const { container } = renderWithMotion(<ThresholdChart series={[349]} rule={rule} status="DOWN" />, 'off');
    expect(wrapper(container)).toHaveAttribute('data-motion-level', 'off');
    expect(wrapper(container).className).toContain('transition-none');
  });

  it('the status color is carried by data-status', () => {
    const { container } = renderWithMotion(<ThresholdChart series={[349]} rule={rule} status="DOWN" />, 'standard');
    expect(wrapper(container)).toHaveAttribute('data-status', 'DOWN');
  });

  it('prefers-reduced-motion forces off', () => {
    const { container } = renderWithMotion(<ThresholdChart series={[1]} rule={rule} status="OK" />, 'expressive', 'en', {
      reducedMotion: true,
    });
    expect(wrapper(container)).toHaveAttribute('data-motion-level', 'off');
  });
});
