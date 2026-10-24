import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

describe('FE-61 Checkbox', () => {
  it('is a labelled checkbox with an optional description', async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Show on the wall" description="Adds a tile" onChange={(e) => onChange(e.target.checked)} />);
    const box = screen.getByRole('checkbox', { name: 'Show on the wall' });
    expect(box).toHaveAccessibleDescription('Adds a tile');
    await userEvent.click(screen.getByText('Show on the wall'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
