import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EASE_OUT, heroTransition, heroVariants, listItemVariants, MotionProvider, MAX_OFFSET_PX } from './motion';

describe('variantes de movimento (03-design.md, seção 4)', () => {
  it('troca do herói: 350 ms ease-out, escala .98 → 1, sem mola', () => {
    expect(heroTransition).toEqual({ duration: 0.35, ease: EASE_OUT });
    expect(heroTransition).not.toHaveProperty('type', 'spring');
    expect(heroVariants.initial).toEqual({ opacity: 0, scale: 0.98 });
    expect(heroVariants.animate).toEqual({ opacity: 1, scale: 1 });
    expect(heroVariants.exit).toEqual({ opacity: 0, scale: 0.98 });
  });

  it('deslocamento de listas nunca passa de 8 px', () => {
    expect(MAX_OFFSET_PX).toBe(8);
    const y = (listItemVariants.initial as { y: number }).y;
    expect(Math.abs(y)).toBeLessThanOrEqual(MAX_OFFSET_PX);
  });

  it('MotionProvider renderiza os filhos', () => {
    render(
      <MotionProvider>
        <p>parede</p>
      </MotionProvider>,
    );
    expect(screen.getByText('parede')).toBeInTheDocument();
  });
});
