import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './Switch';

describe('FE-61 Switch', () => {
  it('is a switch that toggles with click and Space', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Sound" checked={false} onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole('switch', { name: 'Sound' });
    expect(sw).not.toBeChecked();
    await userEvent.click(sw);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    sw.focus();
    await userEvent.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalledTimes(2);
  });

  it('reflects the checked state', () => {
    render(<Switch label="Sound" checked onCheckedChange={() => {}} />);
    expect(screen.getByRole('switch', { name: 'Sound' })).toBeChecked();
  });
});
