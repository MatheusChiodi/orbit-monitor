import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import { WallHeader } from './WallHeader';

const now = new Date(2026, 9, 18, 17, 4, 9);
const ok = { down: 0, warn: 0, ok: 20, total: 20 };
const down = { down: 1, warn: 2, ok: 17, total: 20 };

function header(counts: typeof ok) {
  return <WallHeader environment="Production" counts={counts} now={now} updatedAt={null} connection="open" />;
}

afterEach(() => vi.useRealTimers());

describe('FE-51 WallHeader (global status) motion', () => {
  it('standard: the global phrase cross-fades (old and new present right after the change)', () => {
    const { rerender } = renderWithMotion(header(ok), 'standard');
    rerender(header(down));
    const status = screen.getByRole('status');
    expect(within(status).queryByText('All systems operational')).not.toBeNull();
    expect(within(status).getByText('1 monitor down')).toBeInTheDocument();
  });

  it('off: only the new phrase', async () => {
    const { rerender } = renderWithMotion(header(ok), 'off');
    rerender(header(down));
    await flushMotion();
    const status = screen.getByRole('status');
    expect(within(status).queryByText('All systems operational')).toBeNull();
    expect(within(status).getByText('1 monitor down')).toBeInTheDocument();
  });

  it('counters swap in place (never count) and flash the direction', () => {
    vi.useFakeTimers();
    const { rerender } = renderWithMotion(header(ok), 'standard');
    rerender(header(down));
    const counters = screen.getByRole('list', { name: 'Count by state' });
    expect(within(counters).getByText('1 down')).toHaveAttribute('data-flash', 'up');
    expect(within(counters).getByText('17 ok')).toHaveAttribute('data-flash', 'down');
  });

  it('off: counters never flash', () => {
    vi.useFakeTimers();
    const { rerender } = renderWithMotion(header(ok), 'off');
    rerender(header(down));
    const counters = screen.getByRole('list', { name: 'Count by state' });
    expect(within(counters).getByText('1 down')).not.toHaveAttribute('data-flash');
  });

  it('prefers-reduced-motion forces off', () => {
    const { container } = renderWithMotion(header(down), 'expressive', 'en', { reducedMotion: true });
    const root = container.querySelector('[data-motion-level]') as HTMLElement;
    expect(root).toHaveAttribute('data-motion-level', 'off');
    expect(isStatic(root)).toBe(true);
  });
});
