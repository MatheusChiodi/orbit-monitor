import { describe, expect, it } from 'vitest';
import { renderWithMotion } from '@/test/motion';
import { Sparkline } from './Sparkline';

describe('FE-51 Sparkline motion', () => {
  it('standard: appending a point draws it (data-draw="new-point")', () => {
    const { container, rerender } = renderWithMotion(<Sparkline values={[1, 2, 3]} />, 'standard');
    expect(container.querySelector('path')).not.toHaveAttribute('data-draw');
    rerender(<Sparkline values={[1, 2, 3, 4]} />);
    expect(container.querySelector('path')).toHaveAttribute('data-draw', 'new-point');
  });

  it('off: no draw animation', () => {
    const { container, rerender } = renderWithMotion(<Sparkline values={[1, 2, 3]} />, 'off');
    rerender(<Sparkline values={[1, 2, 3, 4]} />);
    expect(container.querySelector('path')).not.toHaveAttribute('data-draw');
  });

  it('exposes the effective level', () => {
    const { container } = renderWithMotion(<Sparkline values={[1, 2]} />, 'minimal');
    expect(container.querySelector('svg')).toHaveAttribute('data-motion-level', 'minimal');
  });

  it('prefers-reduced-motion forces off', () => {
    const { container, rerender } = renderWithMotion(<Sparkline values={[1, 2]} />, 'expressive', 'en', {
      reducedMotion: true,
    });
    rerender(<Sparkline values={[1, 2, 3]} />);
    expect(container.querySelector('svg')).toHaveAttribute('data-motion-level', 'off');
    expect(container.querySelector('path')).not.toHaveAttribute('data-draw');
  });
});
