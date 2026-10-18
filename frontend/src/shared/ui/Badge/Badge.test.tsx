import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renderiza o conteúdo com tom', () => {
    render(<Badge tone="DOWN">+75% do limite</Badge>);
    const el = screen.getByText('+75% do limite');
    expect(el).toHaveAttribute('data-tone', 'DOWN');
  });
  it('tom neutro por padrão', () => {
    render(<Badge>Checkout</Badge>);
    expect(screen.getByText('Checkout')).toHaveAttribute('data-tone', 'neutral');
  });
});
