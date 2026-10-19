import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithMotion } from '@/test/motion';
import { FlashValue } from './FlashValue';

afterEach(() => vi.useRealTimers());

describe('FE-51 FlashValue', () => {
  it('swaps the text in place and flashes the direction for 600 ms', () => {
    vi.useFakeTimers();
    const { rerender } = renderWithMotion(<FlashValue value={10}>10 QTY</FlashValue>, 'standard');
    expect(screen.getByText('10 QTY')).not.toHaveAttribute('data-flash');
    rerender(<FlashValue value={12}>12 QTY</FlashValue>);
    const el = screen.getByText('12 QTY');
    expect(el).toHaveAttribute('data-flash', 'up');
    expect(el.className).toContain('anim-flash-up');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByText('12 QTY')).not.toHaveAttribute('data-flash');
  });

  it('never flashes when off', () => {
    const { rerender } = renderWithMotion(<FlashValue value={10}>10</FlashValue>, 'off');
    rerender(<FlashValue value={2}>2</FlashValue>);
    expect(screen.getByText('2')).not.toHaveAttribute('data-flash');
  });
});
