import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconMonitor } from '../icons';
import { IconButton } from './IconButton';

describe('FE-61 IconButton', () => {
  it('requires a label and renders a square ghost button', () => {
    render(<IconButton label="Close" icon={IconMonitor} />);
    const button = screen.getByRole('button', { name: 'Close' });
    expect(button).toHaveAttribute('data-variant', 'ghost');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
