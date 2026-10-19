import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { MaintenanceCalendar, type MaintenanceWindow } from './MaintenanceCalendar';
import { slotRange } from './slots';

const weekStart = new Date(2026, 9, 19, 0, 0, 0); // Monday
const groups = [
  { id: 'core', name: 'Core Banking' },
  { id: 'pay', name: 'Payments' },
];
const windows: MaintenanceWindow[] = [
  { id: 'mw1', groupId: 'core', title: 'DB patch', start: new Date(2026, 9, 20, 22, 0).toISOString(), end: new Date(2026, 9, 21, 0, 0).toISOString() },
];

function setup(mode: 'edit' | 'view-only' = 'edit', list = windows) {
  const onCreate = vi.fn();
  render(<MaintenanceCalendar windows={list} groups={groups} weekStart={weekStart} mode={mode} onCreate={onCreate} />);
  return { onCreate };
}

describe('FE-41 maintenance calendar', () => {
  describe('slotRange (pure)', () => {
    it('turns two 30-min cells into a start/end range regardless of drag direction', () => {
      const a = { day: 1, slot: 44 };
      const b = { day: 1, slot: 47 };
      const expected = { start: new Date(2026, 9, 20, 22, 0).toISOString(), end: new Date(2026, 9, 21, 0, 0).toISOString() };
      expect(slotRange(weekStart, a, b)).toEqual(expected);
      expect(slotRange(weekStart, b, a)).toEqual(expected);
    });
  });

  it('renders a week grid with existing windows as labelled blocks', () => {
    setup();
    expect(screen.getByRole('grid', { name: 'Maintenance calendar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'DB patch · Core Banking · Tue 22:00–00:00' })).toBeInTheDocument();
  });

  it('dragging across cells opens the new window form with that range', async () => {
    const { onCreate } = setup();
    const from = screen.getByRole('gridcell', { name: 'Wed 09:00' });
    const to = screen.getByRole('gridcell', { name: 'Wed 10:30' });
    fireEvent.pointerDown(from);
    fireEvent.pointerEnter(to);
    fireEvent.pointerUp(to);
    const dialog = screen.getByRole('dialog', { name: 'New maintenance window' });
    expect(dialog).toHaveTextContent('Wed 09:00 – 11:00');
    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'Deploy');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Group' }), 'pay');
    await userEvent.click(screen.getByRole('button', { name: 'Create window' }));
    expect(onCreate).toHaveBeenCalledWith({
      groupId: 'pay',
      title: 'Deploy',
      start: new Date(2026, 9, 21, 9, 0).toISOString(),
      end: new Date(2026, 9, 21, 11, 0).toISOString(),
    });
  });

  it('keyboard alternative: Enter on a cell, Shift+arrows extend, Enter confirms', async () => {
    setup();
    const cell = screen.getByRole('gridcell', { name: 'Wed 09:00' });
    cell.focus();
    await userEvent.keyboard('{Enter}{Shift>}{ArrowDown}{ArrowDown}{/Shift}{Enter}');
    expect(screen.getByRole('dialog', { name: 'New maintenance window' })).toHaveTextContent('Wed 09:00 – 10:30');
  });

  it('explains windows silence alerts and are excluded from uptime', () => {
    setup();
    expect(screen.getByText('Monitors in a maintenance window are silenced and do not count against uptime.')).toBeInTheDocument();
  });

  it('empty state when orbit.maintenance.json does not exist yet', () => {
    setup('edit', []);
    expect(screen.getByText('No maintenance windows yet. Drag on the calendar to create one.')).toBeInTheDocument();
  });

  it('view-only mode cannot create windows', () => {
    setup('view-only');
    fireEvent.pointerDown(screen.getByRole('gridcell', { name: 'Wed 09:00' }));
    fireEvent.pointerUp(screen.getByRole('gridcell', { name: 'Wed 09:00' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<MaintenanceCalendar windows={windows} groups={groups} weekStart={weekStart} mode="edit" onCreate={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('grid', { name: 'Calendário de manutenção' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'qua 09:00' })).toBeInTheDocument();
  });
});
