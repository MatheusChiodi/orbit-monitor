import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

const OPTIONS = [
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days', disabled: true },
] as const;

function Harness() {
  const [value, setValue] = useState<string>('24h');
  return <SegmentedControl label="Range" options={OPTIONS} value={value} onChange={setValue} />;
}

describe('FE-61 SegmentedControl', () => {
  it('is a labelled radiogroup with one checked radio', () => {
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: 'Range' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '24 h' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '7 days' })).not.toBeChecked();
  });

  it('selects on click', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('radio', { name: '7 days' }));
    expect(screen.getByRole('radio', { name: '7 days' })).toBeChecked();
  });

  it('arrow keys move and select, skipping disabled options; only the checked radio is tabbable', async () => {
    render(<Harness />);
    const first = screen.getByRole('radio', { name: '24 h' });
    expect(first).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: '7 days' })).toHaveAttribute('tabindex', '-1');
    first.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '7 days' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: '7 days' })).toBeChecked();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '24 h' })).toHaveFocus();
  });
});
