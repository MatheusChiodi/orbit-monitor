import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import { GroupManager, groupIdFor } from './GroupManager';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));

function setup() {
  const handlers = {
    onSave: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };
  const groups = [...snap.groups, { id: 'empty', name: 'Spare' }];
  render(<GroupManager open groups={groups} monitors={snap.monitors} {...handlers} />);
  return { ...handlers, dialog: screen.getByRole('dialog', { name: 'Manage groups' }) };
}

describe('Monitors › Manage groups', () => {
  it('lists every group with its monitor count', () => {
    const { dialog } = setup();
    expect(within(dialog).getByText('Spare')).toBeInTheDocument();
    expect(within(dialog).getByRole('listitem', { name: 'Payments' })).toHaveTextContent('4 monitors');
  });

  it('renames a group and keeps its position', async () => {
    const { dialog, onSave } = setup();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Rename Payments' }));
    const input = within(dialog).getByRole('textbox', { name: 'Group name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Money{Enter}');
    const index = snap.groups.findIndex((g) => g.name === 'Payments');
    expect(onSave).toHaveBeenCalledWith({ id: snap.groups[index]!.id, name: 'Money', order: index });
  });

  it('deletes only empty groups', async () => {
    const { dialog, onDelete } = setup();
    expect(within(dialog).getByRole('button', { name: 'Delete Payments' })).toBeDisabled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete Spare' }));
    expect(onDelete).toHaveBeenCalledWith('empty');
  });

  it('adds a group with an id from its name; an empty name is refused', async () => {
    const { dialog, onSave } = setup();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add group' }));
    expect(within(dialog).getByText('Type a name for the group')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'New group' }), 'Data Warehouse');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add group' }));
    expect(onSave).toHaveBeenCalledWith({ id: 'data-warehouse', name: 'Data Warehouse', order: snap.groups.length + 1 });
  });

  it('group ids are readable and unique', () => {
    expect(groupIdFor('Pagamentos Ágeis', [])).toBe('pagamentos-ageis');
    expect(groupIdFor('Web', [{ id: 'web' }])).toBe('web-2');
    expect(groupIdFor('!!!', [])).toBe('group');
  });
});
