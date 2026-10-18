import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sparkline, sparklinePath } from './Sparkline';

describe('sparklinePath', () => {
  it('escala os valores na caixa (y invertido)', () => {
    expect(sparklinePath([0, 10], 100, 20)).toBe('M0,20 L100,0');
  });
  it('quebra a linha nos buracos (null)', () => {
    expect(sparklinePath([0, null, 10, 10], 30, 10)).toBe('M0,10 M20,0 L30,0');
  });
  it('série constante fica no meio', () => {
    expect(sparklinePath([5, 5], 10, 10)).toBe('M0,5 L10,5');
  });
  it('vazio devolve string vazia', () => {
    expect(sparklinePath([], 10, 10)).toBe('');
    expect(sparklinePath([null], 10, 10)).toBe('');
  });
});

describe('Sparkline', () => {
  it('renderiza um svg rotulado', () => {
    render(<Sparkline values={[1, 2, 3]} label="Tendência da fila" />);
    expect(screen.getByRole('img', { name: 'Tendência da fila' })).toBeInTheDocument();
  });
  it('é decorativo sem rótulo', () => {
    const { container } = render(<Sparkline values={[1, 2]} status="DOWN" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('path')?.getAttribute('stroke')).toBe('var(--down)');
  });
});
