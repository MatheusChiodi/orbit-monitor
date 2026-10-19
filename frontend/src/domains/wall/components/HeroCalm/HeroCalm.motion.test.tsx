import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { entersAnimated, isStatic, renderWithMotion } from '@/test/motion';
import { HeroCalm } from './HeroCalm';

const now = new Date(2026, 9, 18, 17, 10, 0);
const props = { uptime24h: 99.97, lastRecoveryAt: null, nearLimitCount: 2, now };

describe('FE-51 HeroCalm motion', () => {
  it('standard: enters animated and keeps the documented ring signal', () => {
    const { container } = renderWithMotion(<HeroCalm {...props} />, 'standard');
    const region = screen.getByRole('region', { name: 'Situation' });
    expect(region).toHaveAttribute('data-motion-level', 'standard');
    expect(entersAnimated(region)).toBe(true);
    expect(container.querySelector('.anim-ring')).not.toBeNull();
  });

  it('minimal: no ring (no pulses), still fades', () => {
    const { container } = renderWithMotion(<HeroCalm {...props} />, 'minimal');
    expect(container.querySelector('.anim-ring')).toBeNull();
  });

  it('off: static and without the ring', () => {
    const { container } = renderWithMotion(<HeroCalm {...props} />, 'off');
    expect(isStatic(screen.getByRole('region', { name: 'Situation' }))).toBe(true);
    expect(container.querySelector('.anim-ring')).toBeNull();
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(<HeroCalm {...props} />, 'expressive', 'en', { reducedMotion: true });
    expect(screen.getByRole('region', { name: 'Situation' })).toHaveAttribute('data-motion-level', 'off');
  });
});
