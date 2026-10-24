import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { MaintenanceCalendar, type MaintenanceCalendarProps, type MaintenanceWindow } from './MaintenanceCalendar';
import { slotRange } from './slots';
import { daySegments, fromLocalInput, nextHourRange, nowMarker, toLocalInput } from './weekGrid';

const weekStart = new Date(2026, 9, 19, 0, 0, 0); // Monday
const now = new Date(2026, 9, 21, 14, 30); // Wednesday
const groups = [
  { id: 'core', name: 'Core Banking' },
  { id: 'pay', name: 'Payments' },
];
const windows: MaintenanceWindow[] = [
  { id: 'mw1', windowId: 'mw1', target: 'core', title: 'DB patch', start: new Date(2026, 9, 20, 22, 0).toISOString(), end: new Date(2026, 9, 21, 0, 0).toISOString() },
];

function setup(props: Partial<MaintenanceCalendarProps> = {}) {
  const onCreate = vi.fn();
  const onDelete = vi.fn();
  const onWeekChange = vi.fn();
  render(
    <MaintenanceCalendar windows={windows} groups={groups} weekStart={weekStart} now={now} mode="edit" onSave={onCreate} onDelete={onDelete} onWeekChange={onWeekChange} {...props} />,
  );
  return { onCreate, onDelete, onWeekChange };
}

describe('FE-41 maintenance calendar', () => {
  describe('pure helpers', () => {
    it('turns two 30-min cells into a start/end range regardless of drag direction', () => {
      const a = { day: 1, slot: 44 };
      const b = { day: 1, slot: 47 };
      const expected = { start: new Date(2026, 9, 20, 22, 0).toISOString(), end: new Date(2026, 9, 21, 0, 0).toISOString() };
      expect(slotRange(weekStart, a, b)).toEqual(expected);
      expect(slotRange(weekStart, b, a)).toEqual(expected);
    });

    it('splits a window that crosses midnight into one segment per day', () => {
      const segments = daySegments(weekStart, new Date(2026, 9, 20, 18, 0).toISOString(), new Date(2026, 9, 21, 6, 0).toISOString());
      expect(segments).toEqual([
        { day: 1, top: 75, height: 25, first: true },
        { day: 2, top: 0, height: 25, first: false },
      ]);
    });

    it('places the now marker only inside the visible week', () => {
      expect(nowMarker(weekStart, now)).toEqual({ day: 2, top: (14.5 / 24) * 100 });
      expect(nowMarker(weekStart, new Date(2026, 9, 27, 9, 0))).toBeNull();
    });

    it('round-trips datetime-local values and defaults to the next full hour', () => {
      expect(toLocalInput(new Date(2026, 9, 21, 9, 5))).toBe('2026-10-21T09:05');
      expect(fromLocalInput('2026-10-21T09:05')).toEqual(new Date(2026, 9, 21, 9, 5));
      expect(fromLocalInput('')).toBeNull();
      expect(nextHourRange(now)).toEqual({ start: new Date(2026, 9, 21, 15, 0).toISOString(), end: new Date(2026, 9, 21, 16, 0).toISOString() });
    });
  });

  it('has day headers with dates, an hour axis and marks today', () => {
    setup();
    expect(screen.getByRole('grid', { name: 'Maintenance calendar' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Mon 19' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Wed 21/ })).toHaveAttribute('aria-current', 'date');
    expect(screen.getByRole('rowheader', { name: '09:00' })).toBeInTheDocument();
    expect(screen.getByTestId('now-marker')).toBeInTheDocument();
  });

  it('lists the windows of the week in words', () => {
    setup();
    expect(screen.getByText('DB patch · Core Banking · Tue 22:00–00:00')).toBeInTheDocument();
  });

  it('moves between weeks', async () => {
    const { onWeekChange } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(onWeekChange).toHaveBeenCalledWith(new Date(2026, 9, 26));
    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(onWeekChange).toHaveBeenCalledWith(new Date(2026, 9, 12));
  });

  it('"New window" opens a form with name, group, start, end and reason', async () => {
    const { onCreate } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'New window' }));
    expect(screen.getByRole('dialog', { name: 'New maintenance window' })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'Kernel update');
    fireEvent.change(screen.getByLabelText(/Starts/), { target: { value: '2026-10-22T01:00' } });
    fireEvent.change(screen.getByLabelText(/Ends/), { target: { value: '2026-10-22T03:00' } });
    await userEvent.type(screen.getByRole('textbox', { name: /Reason/ }), 'Security patch');
    await userEvent.click(screen.getByRole('button', { name: 'Create window' }));
    expect(onCreate).toHaveBeenCalledWith({
      target: 'core',
      title: 'Kernel update',
      start: new Date(2026, 9, 22, 1, 0).toISOString(),
      end: new Date(2026, 9, 22, 3, 0).toISOString(),
      reason: 'Security patch',
    });
  });

  it('says what is wrong instead of saving an invalid window', async () => {
    const { onCreate } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'New window' }));
    fireEvent.change(screen.getByLabelText(/Ends/), { target: { value: '2026-10-21T10:00' } });
    fireEvent.change(screen.getByLabelText(/Starts/), { target: { value: '2026-10-21T11:00' } });
    await userEvent.click(screen.getByRole('button', { name: 'Create window' }));
    expect(screen.getByText('Give the window a name.')).toBeInTheDocument();
    expect(screen.getByText('The end must be after the start.')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('dragging across cells is a shortcut: it opens the form with that range', async () => {
    const { onCreate } = setup();
    const from = screen.getByRole('gridcell', { name: 'Wed 09:00' });
    const to = screen.getByRole('gridcell', { name: 'Wed 10:30' });
    fireEvent.pointerDown(from);
    fireEvent.pointerEnter(to);
    fireEvent.pointerUp(to);
    const dialog = screen.getByRole('dialog', { name: 'New maintenance window' });
    expect(dialog).toHaveTextContent('Wed 09:00 – 11:00');
    await userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'Deploy');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /Applies to/ }), 'pay');
    await userEvent.click(screen.getByRole('button', { name: 'Create window' }));
    expect(onCreate).toHaveBeenCalledWith({
      target: 'pay',
      title: 'Deploy',
      start: new Date(2026, 9, 21, 9, 0).toISOString(),
      end: new Date(2026, 9, 21, 11, 0).toISOString(),
    });
  });

  it('keyboard: one tab stop, arrows move, Enter on a cell, Shift+arrows extend, Enter confirms', async () => {
    setup();
    const tabbable = screen.getAllByRole('gridcell').filter((c) => c.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    const cell = screen.getByRole('gridcell', { name: 'Wed 09:00' });
    cell.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('gridcell', { name: 'Thu 09:00' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}{Enter}{Shift>}{ArrowDown}{ArrowDown}{/Shift}{Enter}');
    expect(screen.getByRole('dialog', { name: 'New maintenance window' })).toHaveTextContent('Wed 09:00 – 10:30');
  });

  it('clicking a window edits it; Delete asks first', async () => {
    const { onCreate, onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: /^Edit DB patch/ }));
    const dialog = screen.getByRole('dialog', { name: 'Edit maintenance window' });
    expect(screen.getByRole('textbox', { name: /Name/ })).toHaveValue('DB patch');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ id: 'mw1', target: 'core', title: 'DB patch' }));
    expect(dialog).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Edit DB patch/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog', { name: 'Delete DB patch?' })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete window' }));
    expect(onDelete).toHaveBeenCalledWith('mw1');
  });

  it('a window repeats with a cron expression and a duration; targets can be monitors', async () => {
    const { onCreate } = setup({
      monitors: [
        { id: 'shop', name: 'Shop', type: 'HTTP' },
        { id: 'orbit_self', name: 'Orbit', type: 'SELF' as never },
      ],
    });
    await userEvent.click(screen.getByRole('button', { name: 'New window' }));
    const target = screen.getByRole('combobox', { name: /Applies to/ });
    expect(screen.getByRole('group', { name: 'Monitors' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Orbit' })).toBeNull();
    await userEvent.selectOptions(target, 'shop');
    await userEvent.type(screen.getByRole('textbox', { name: /Name/ }), 'Nightly backup');
    await userEvent.click(screen.getByRole('radio', { name: 'Repeats' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create window' }));
    expect(screen.getByText('Type a cron expression, e.g. 0 2 * * 0.')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: /cron/ }), '0 2 * * 0');
    await userEvent.click(screen.getByRole('button', { name: 'Create window' }));
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ target: 'shop', title: 'Nightly backup', cron: '0 2 * * 0', durationMinutes: 60 }));
  });

  it('a new-window request from outside opens the form', () => {
    setup({ newRequest: 1 });
    expect(screen.getByRole('dialog', { name: 'New maintenance window' })).toBeInTheDocument();
  });

  it('empty week', () => {
    setup({ windows: [] });
    expect(screen.getByText('No maintenance windows this week.')).toBeInTheDocument();
  });

  it('view-only mode cannot create windows', () => {
    setup({ mode: 'view-only' });
    expect(screen.queryByRole('button', { name: 'New window' })).toBeNull();
    fireEvent.pointerDown(screen.getByRole('gridcell', { name: 'Wed 09:00' }));
    fireEvent.pointerUp(screen.getByRole('gridcell', { name: 'Wed 09:00' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<MaintenanceCalendar windows={windows} groups={groups} weekStart={weekStart} now={now} mode="edit" onSave={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('grid', { name: 'Calendário de manutenção' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'qua 09:00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova janela' })).toBeInTheDocument();
  });
});
