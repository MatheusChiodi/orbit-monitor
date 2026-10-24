import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as icons from './icons';

describe('FE-61 icons', () => {
  it('are decorative by default and sized 16 px', () => {
    const { container } = render(<icons.IconPlus />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '16');
  });

  it('a title makes the icon an image with that name', () => {
    render(<icons.IconAlert title="Warning" size={20} />);
    expect(screen.getByRole('img', { name: 'Warning' })).toHaveAttribute('width', '20');
  });

  it('every icon keeps the 1.5 px stroke at its size', () => {
    for (const Icon of Object.values(icons).filter((v) => typeof v === 'function')) {
      const { container, unmount } = render(<Icon size={20} />);
      expect(container.querySelector('svg')).toHaveAttribute('stroke-width', String(1.5 * (24 / 20)));
      unmount();
    }
  });
});
