import { screen } from '@testing-library/react';
import { AnimatePresence } from 'motion/react';
import { describe, expect, it } from 'vitest';
import { entersAnimated, flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import { Badge } from './Badge';

function Chips({ items }: { items: string[] }) {
  return (
    <AnimatePresence>
      {items.map((item) => (
        <Badge key={item}>{item}</Badge>
      ))}
    </AnimatePresence>
  );
}

describe('FE-51 Badge motion', () => {
  it('standard: a chip enters animated', () => {
    renderWithMotion(<Chips items={['Checkout']} />, 'standard');
    const chip = screen.getByText('Checkout');
    expect(chip).toHaveAttribute('data-motion-level', 'standard');
    expect(entersAnimated(chip)).toBe(true);
  });

  it('off: static', () => {
    renderWithMotion(<Chips items={['Checkout']} />, 'off');
    expect(isStatic(screen.getByText('Checkout'))).toBe(true);
  });

  it('standard: a removed chip leaves through AnimatePresence', async () => {
    const { rerender } = renderWithMotion(<Chips items={['Checkout', 'Payouts']} />, 'standard');
    rerender(<Chips items={['Checkout']} />);
    expect(screen.queryByText('Payouts')).not.toBeNull();
    await flushMotion(500);
    expect(screen.queryByText('Payouts')).toBeNull();
  });

  it('off: removal is immediate', async () => {
    const { rerender } = renderWithMotion(<Chips items={['Checkout', 'Payouts']} />, 'off');
    rerender(<Chips items={['Checkout']} />);
    await flushMotion();
    expect(screen.queryByText('Payouts')).toBeNull();
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(<Chips items={['Checkout']} />, 'expressive', 'en', { reducedMotion: true });
    const chip = screen.getByText('Checkout');
    expect(chip).toHaveAttribute('data-motion-level', 'off');
    expect(isStatic(chip)).toBe(true);
  });
});
