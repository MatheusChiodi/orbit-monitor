import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders the content with a tone', () => {
    render(<Badge tone="DOWN">+75% over limit</Badge>);
    const el = screen.getByText('+75% over limit');
    expect(el).toHaveAttribute('data-tone', 'DOWN');
  });
  it('neutral tone by default', () => {
    render(<Badge>Checkout</Badge>);
    expect(screen.getByText('Checkout')).toHaveAttribute('data-tone', 'neutral');
  });
});
