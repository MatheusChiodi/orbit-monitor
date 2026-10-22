import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GroupOrderEditor } from './GroupOrderEditor';

const groups = [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }, { id: 'c', name: 'Gamma' }];

describe('FE-13 group order', () => {
  it('moves a group up or down and reports the new group order', async () => {
    const onGroupsChange = vi.fn();
    render(<GroupOrderEditor groups={groups} monitors={[]} onChange={vi.fn()} onGroupsChange={onGroupsChange} />);
    expect(screen.getByRole('button', { name: 'Move Alpha up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Gamma down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Beta up' }));
    expect(onGroupsChange).toHaveBeenCalledWith(['b', 'a', 'c']);
    await userEvent.click(screen.getByRole('button', { name: 'Move Beta down' }));
    expect(onGroupsChange).toHaveBeenLastCalledWith(['a', 'c', 'b']);
    expect(screen.getByRole('status')).toHaveTextContent('Beta moved to position 3 of 3');
  });

  it('no group buttons without the callback or when read-only', () => {
    const { rerender } = render(<GroupOrderEditor groups={groups} monitors={[]} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Move Alpha/ })).toBeNull();
    rerender(<GroupOrderEditor groups={groups} monitors={[]} onChange={vi.fn()} onGroupsChange={vi.fn()} editable={false} />);
    expect(screen.queryByRole('button', { name: /Move Alpha/ })).toBeNull();
  });
});
