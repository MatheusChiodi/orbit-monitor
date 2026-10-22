import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { entersAnimated, isStatic, renderWithMotion } from '@/test/motion';
import { ScreenTransition } from './ScreenTransition';

describe('FE-51 console screen transitions', () => {
  it('standard: each route enters with the enter preset', () => {
    const { rerender } = renderWithMotion(<ScreenTransition routeKey="monitors"><p>list</p></ScreenTransition>, 'standard');
    rerender(<ScreenTransition routeKey="incidents"><p>incidents</p></ScreenTransition>);
    const region = screen.getByText('incidents').parentElement!;
    expect(region).toHaveAttribute('data-motion-level', 'standard');
    expect(entersAnimated(region)).toBe(true);
  });

  it('off: screens switch instantly', () => {
    renderWithMotion(<ScreenTransition routeKey="monitors"><p>list</p></ScreenTransition>, 'off');
    expect(isStatic(screen.getByText('list').parentElement!)).toBe(true);
  });
});
