import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Menu } from './Menu';

function setup() {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <Menu
      label="Actions for Orbit health"
      items={[
        { id: 'edit', label: 'Edit', onSelect: onEdit },
        { id: 'pause', label: 'Pause', onSelect: () => {}, disabled: true },
        { id: 'delete', label: 'Delete', onSelect: onDelete, danger: true },
      ]}
    />,
  );
  return { onEdit, onDelete, trigger: screen.getByRole('button', { name: 'Actions for Orbit health' }) };
}

describe('FE-61 Menu', () => {
  it('a menu button opens a labelled menu and focuses the first item', async () => {
    const { trigger } = setup();
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Actions for Orbit health' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
  });

  it('arrow keys skip disabled items and wrap; Enter selects and closes', async () => {
    const { onDelete, trigger } = setup();
    await userEvent.click(trigger);
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.keyboard('{Enter}');
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('Escape closes and returns focus to the button', async () => {
    const { onEdit, trigger } = setup();
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('a click outside closes it', async () => {
    const { trigger } = setup();
    await userEvent.click(trigger);
    await userEvent.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ArrowDown on the button opens the menu', async () => {
    const { trigger } = setup();
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
  });
});
