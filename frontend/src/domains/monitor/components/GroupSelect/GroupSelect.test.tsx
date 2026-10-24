import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AUTO_GROUP, GroupSelect } from './GroupSelect';

describe('GroupSelect', () => {
  it('a fresh install offers the Default group created on save', () => {
    render(<GroupSelect groups={[]} value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Group')).toHaveValue(AUTO_GROUP);
    expect(screen.getByRole('option', { name: 'Default (created when you save)' })).toBeInTheDocument();
    expect(screen.getByText(/Orbit creates a group named Default when you save/)).toBeInTheDocument();
  });

  it('creates a group inline and selects it', async () => {
    const onCreate = vi.fn().mockImplementation(async (g: { id: string; name: string }) => ({ id: g.id, name: g.name }));
    const onChange = vi.fn();
    render(<GroupSelect groups={[{ id: 'web', name: 'Web' }]} value="web" onChange={onChange} onCreate={onCreate} />);
    await userEvent.click(screen.getByRole('button', { name: 'New group' }));
    const dialog = screen.getByRole('dialog', { name: 'New group' });
    await userEvent.type(within(dialog).getByLabelText('Group name'), 'Payments');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create group' }));
    expect(onCreate).toHaveBeenCalledWith({ id: 'payments', name: 'Payments', order: 1 });
    expect(onChange).toHaveBeenCalledWith('payments');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('refuses an empty or repeated name with a clear message', async () => {
    const onCreate = vi.fn();
    render(<GroupSelect groups={[{ id: 'web', name: 'Web' }]} value="web" onChange={vi.fn()} onCreate={onCreate} />);
    await userEvent.click(screen.getByRole('button', { name: 'New group' }));
    const dialog = screen.getByRole('dialog', { name: 'New group' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create group' }));
    expect(within(dialog).getByText('Enter a name for the group')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('Group name'), 'web');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create group' }));
    expect(within(dialog).getByText('There is already a group with this name')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });
});
