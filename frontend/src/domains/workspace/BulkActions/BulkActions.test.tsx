import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import { renderWithLocale } from '@/test/renderWithLocale';
import { BulkActions, type BulkActionsProps } from './BulkActions';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));
const selected = snap.monitors.slice(0, 3);
const ids = ['reconciliation', 'checkout', 'acquirer'];

function setup(props: Partial<BulkActionsProps> = {}) {
  const handlers = { onPause: vi.fn(), onMove: vi.fn(), onDelete: vi.fn(), onClear: vi.fn() };
  render(<BulkActions selected={selected} groups={snap.groups} mode="edit" {...handlers} {...props} />);
  return handlers;
}

describe('FE-31 bulk actions', () => {
  it('shows a toolbar with the selection count', () => {
    setup();
    expect(screen.getByRole('toolbar', { name: 'Selected monitors' })).toHaveTextContent('3 selected');
  });

  it('pauses and resumes the selected monitors', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(h.onPause).toHaveBeenCalledWith(ids, true);
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(h.onPause).toHaveBeenCalledWith(ids, false);
  });

  it('pause is offered only when the caller supports it', () => {
    setup({ onPause: undefined });
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
  });

  it('moves to another group', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Move to group' }));
    const dialog = screen.getByRole('dialog', { name: 'Move to group' });
    await userEvent.selectOptions(within(dialog).getByRole('combobox', { name: 'Group' }), 'core');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Move' }));
    expect(h.onMove).toHaveBeenCalledWith(ids, 'core');
  });

  it('delete asks for confirmation naming how many monitors; Cancel has focus', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete 3 monitors?' });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete 3 monitors' }));
    expect(h.onDelete).toHaveBeenCalledWith(ids);
  });

  it('cancelling the confirmation deletes nothing', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.keyboard('{Escape}');
    expect(h.onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clears the selection', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(h.onClear).toHaveBeenCalled();
  });

  it('nothing selected or view-only → no toolbar', () => {
    setup({ selected: [] });
    expect(screen.queryByRole('toolbar')).toBeNull();
    setup({ mode: 'view-only' });
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<BulkActions selected={selected} groups={snap.groups} mode="edit" onMove={vi.fn()} onDelete={vi.fn()} onClear={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('toolbar', { name: 'Monitores selecionados' })).toHaveTextContent('3 selecionados');
  });
});
