import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import { renderWithLocale } from '@/test/renderWithLocale';
import { BulkActions } from './BulkActions';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));
const selected = snap.monitors.slice(0, 3);

function setup(mode: 'edit' | 'view-only' = 'edit', list = selected) {
  const handlers = { onPause: vi.fn(), onTag: vi.fn(), onMove: vi.fn(), onDelete: vi.fn(), onClear: vi.fn() };
  render(<BulkActions selected={list} groups={snap.groups} mode={mode} {...handlers} />);
  return handlers;
}

describe('FE-31 bulk actions', () => {
  it('shows a toolbar with the selection count', () => {
    setup();
    const toolbar = screen.getByRole('toolbar', { name: 'Bulk actions' });
    expect(toolbar).toHaveTextContent('3 selected');
  });

  it('pauses the selected monitors', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(h.onPause).toHaveBeenCalledWith(['reconciliation', 'checkout', 'acquirer']);
  });

  it('adds a tag', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Tag' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Tag' }), 'critical{Enter}');
    expect(h.onTag).toHaveBeenCalledWith(['reconciliation', 'checkout', 'acquirer'], 'critical');
  });

  it('moves to another group', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Move to group' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Target group' }), 'core');
    await userEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(h.onMove).toHaveBeenCalledWith(['reconciliation', 'checkout', 'acquirer'], 'core');
  });

  it('delete asks for confirmation naming how many monitors', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete 3 monitors?' });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete 3 monitors' }));
    expect(h.onDelete).toHaveBeenCalledWith(['reconciliation', 'checkout', 'acquirer']);
  });

  it('cancelling the confirmation deletes nothing', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.keyboard('{Escape}');
    expect(h.onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('nothing selected → no toolbar', () => {
    setup('edit', []);
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('view-only mode renders no bulk actions', () => {
    setup('view-only');
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(
      <BulkActions selected={selected} groups={snap.groups} mode="edit" onPause={vi.fn()} onTag={vi.fn()} onMove={vi.fn()} onDelete={vi.fn()} onClear={vi.fn()} />,
      'pt-BR',
    );
    expect(screen.getByRole('toolbar', { name: 'Ações em lote' })).toHaveTextContent('3 selecionados');
  });
});
