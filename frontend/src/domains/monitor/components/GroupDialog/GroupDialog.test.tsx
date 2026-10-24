import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GroupDialog } from './GroupDialog';

const groups = [
  { id: 'web', name: 'Web', order: 3 },
  { id: 'db', name: 'Databases', order: 4 },
];

describe('GroupDialog', () => {
  it('renames a group keeping its id and place', async () => {
    const onSave = vi.fn().mockImplementation(async (g: { id: string; name: string }) => g);
    const onSaved = vi.fn();
    render(<GroupDialog open group={groups[0]} groups={groups} onClose={vi.fn()} onSave={onSave} onSaved={onSaved} />);
    expect(screen.getByRole('dialog', { name: 'Rename group' })).toBeInTheDocument();
    const input = screen.getByLabelText('Group name');
    expect(input).toHaveValue('Web');
    await userEvent.clear(input);
    await userEvent.type(input, 'Websites');
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    expect(onSave).toHaveBeenCalledWith({ id: 'web', name: 'Websites', color: null, description: null, order: 3 });
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'web', name: 'Websites' }));
  });

  it('creates a group with a free id at the end', async () => {
    const onSave = vi.fn().mockImplementation(async (g: { id: string; name: string }) => g);
    render(<GroupDialog open groups={groups} onClose={vi.fn()} onSave={onSave} onSaved={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Group name'), 'Web');
    await userEvent.click(screen.getByRole('button', { name: 'Create group' }));
    expect(screen.getByText('There is already a group with this name')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Group name'));
    await userEvent.type(screen.getByLabelText('Group name'), 'Queues');
    await userEvent.click(screen.getByRole('button', { name: 'Create group' }));
    expect(onSave).toHaveBeenCalledWith({ id: 'queues', name: 'Queues', order: 2 });
  });

  it('keeping the same name on rename is allowed', async () => {
    const onSave = vi.fn().mockImplementation(async (g: { id: string; name: string }) => g);
    render(<GroupDialog open group={groups[1]} groups={groups} onClose={vi.fn()} onSave={onSave} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    expect(onSave).toHaveBeenCalled();
  });
});
