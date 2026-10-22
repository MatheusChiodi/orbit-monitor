import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { groupSla } from './sla';
import { SlaReports, type SlaRow } from './SlaReports';

const now = new Date(2026, 9, 18, 17, 0, 0);
const rows: SlaRow[] = [
  { id: 'a', name: 'Checkout', groupName: 'Payments', uptime: 99, downMs: 60_000, incidents: 1 },
  { id: 'b', name: 'Refunds', groupName: 'Payments', uptime: 100, downMs: 0, incidents: 0 },
  { id: 'c', name: 'Login', groupName: 'Portal', uptime: null, downMs: 0, incidents: 0 },
];

describe('FE-43 uptime per group', () => {
  it('a group is the mean of its measured monitors, with summed downtime and incidents', () => {
    expect(groupSla(rows)).toEqual([
      { id: 'group:Payments', name: 'Payments', groupName: '', uptime: 99.5, downMs: 60_000, incidents: 1 },
      { id: 'group:Portal', name: 'Portal', groupName: '', uptime: null, downMs: 0, incidents: 0 },
    ]);
  });

  it('shows an "Uptime by group" table and exports both tables', async () => {
    const onExport = vi.fn();
    render(<SlaReports rows={rows} historyStart={new Date(now.getTime() - 86_400_000).toISOString()} now={now} onExport={onExport} />);
    const table = screen.getByRole('table', { name: 'Uptime by group' });
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('99.50%');
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(onExport.mock.calls[0]![0]).toContain('group,Payments');
  });
});
