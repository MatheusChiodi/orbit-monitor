import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sparkline, sparklinePath } from './Sparkline';

describe('sparklinePath', () => {
  it('scales the values into the box (inverted y)', () => {
    expect(sparklinePath([0, 10], 100, 20)).toBe('M0,20 L100,0');
  });
  it('breaks the line on gaps (null)', () => {
    expect(sparklinePath([0, null, 10, 10], 30, 10)).toBe('M0,10 M20,0 L30,0');
  });
  it('a constant series stays in the middle', () => {
    expect(sparklinePath([5, 5], 10, 10)).toBe('M0,5 L10,5');
  });
  it('empty returns an empty string', () => {
    expect(sparklinePath([], 10, 10)).toBe('');
    expect(sparklinePath([null], 10, 10)).toBe('');
  });
});

describe('Sparkline', () => {
  it('renders a labelled svg', () => {
    render(<Sparkline values={[1, 2, 3]} label="Queue trend" />);
    expect(screen.getByRole('img', { name: 'Queue trend' })).toBeInTheDocument();
  });
  it('is decorative without a label', () => {
    const { container } = render(<Sparkline values={[1, 2]} status="DOWN" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('path')?.getAttribute('stroke')).toBe('var(--down)');
  });
});
