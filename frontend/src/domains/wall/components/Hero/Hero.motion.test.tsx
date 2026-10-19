import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { entersAnimated, isStatic, renderWithMotion } from '@/test/motion';
import { mockSnapshot } from '../../mock';
import { pickHero } from '../../selectors';
import { Hero } from './Hero';

const now = new Date(2026, 9, 18, 17, 10, 0);

function selection(value = 349) {
  const hero = pickHero(mockSnapshot('incident', now))!;
  return { ...hero, monitor: { ...hero.monitor, value } };
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => vi.useRealTimers());

describe('FE-51 Hero motion', () => {
  it('standard: the hero panel enters animated', () => {
    renderWithMotion(<Hero selection={selection()} now={now} onAcknowledge={vi.fn()} />, 'standard');
    const region = screen.getByRole('region', { name: 'Situation' });
    expect(region).toHaveAttribute('data-motion-level', 'standard');
    expect(entersAnimated(region)).toBe(true);
  });

  it('off: static', () => {
    renderWithMotion(<Hero selection={selection()} now={now} onAcknowledge={vi.fn()} />, 'off');
    expect(isStatic(screen.getByRole('region', { name: 'Situation' }))).toBe(true);
  });

  it('value change: swaps in place (no counting) with a direction flash', () => {
    vi.useFakeTimers();
    const { rerender } = renderWithMotion(<Hero selection={selection(349)} now={now} onAcknowledge={vi.fn()} />, 'standard');
    rerender(<Hero selection={selection(360)} now={now} onAcknowledge={vi.fn()} />);
    const value = screen.getByText('360 QTY');
    expect(value).toHaveAttribute('data-flash', 'up');
    rerender(<Hero selection={selection(300)} now={now} onAcknowledge={vi.fn()} />);
    expect(screen.getByText('300 QTY')).toHaveAttribute('data-flash', 'down');
  });

  it('minimal still flashes (color only); off never does', () => {
    vi.useFakeTimers();
    const minimal = renderWithMotion(<Hero selection={selection(349)} now={now} onAcknowledge={vi.fn()} />, 'minimal');
    minimal.rerender(<Hero selection={selection(360)} now={now} onAcknowledge={vi.fn()} />);
    expect(screen.getByText('360 QTY')).toHaveAttribute('data-flash', 'up');
    minimal.unmount();
    const off = renderWithMotion(<Hero selection={selection(349)} now={now} onAcknowledge={vi.fn()} />, 'off');
    off.rerender(<Hero selection={selection(360)} now={now} onAcknowledge={vi.fn()} />);
    expect(screen.getByText('360 QTY')).not.toHaveAttribute('data-flash');
  });

  it('status change cross-fades the tone (data-status follows)', () => {
    const s = selection();
    const { rerender, container } = renderWithMotion(<Hero selection={s} now={now} onAcknowledge={vi.fn()} />, 'standard');
    rerender(<Hero selection={{ ...s, monitor: { ...s.monitor, status: 'WARN' } }} now={now} onAcknowledge={vi.fn()} />);
    expect(container.querySelector('[data-status="WARN"]')).not.toBeNull();
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(<Hero selection={selection()} now={now} onAcknowledge={vi.fn()} />, 'expressive', 'en', {
      reducedMotion: true,
    });
    const region = screen.getByRole('region', { name: 'Situation' });
    expect(region).toHaveAttribute('data-motion-level', 'off');
    expect(isStatic(region)).toBe(true);
  });
});
