import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SlaReports, type SlaRow } from './SlaReports';

const now = new Date(2026, 9, 18, 17, 0, 0);
const historyStart = new Date(now.getTime() - 24 * 3_600_000).toISOString();
const rows: SlaRow[] = [
  { id: 'a', name: 'Checkout', groupName: 'Payments', uptime: 99, downMs: 60_000, incidents: 1 },
  { id: 'b', name: 'Login', groupName: 'Portal', uptime: 100, downMs: 0, incidents: 0 },
];

describe('FE-43 reports redesign', () => {
  it('both tables use human headers instead of symbols', () => {
    render(<SlaReports rows={rows} historyStart={historyStart} now={now} onExport={vi.fn()} />);
    for (const name of ['Uptime by group', 'Uptime by monitor']) {
      const table = screen.getByRole('table', { name });
      for (const header of ['Availability', 'Downtime', 'Incidents']) {
        expect(within(table).getByRole('columnheader', { name: header })).toBeInTheDocument();
      }
      expect(within(table).queryByRole('columnheader', { name: '%' })).toBeNull();
    }
  });

  it('groups come first and both tables share the same columns', () => {
    render(<SlaReports rows={rows} historyStart={historyStart} now={now} onExport={vi.fn()} />);
    const [first, second] = screen.getAllByRole('table');
    expect(first).toHaveAccessibleName('Uptime by group');
    expect(second).toHaveAccessibleName('Uptime by monitor');
    expect(within(first!).getAllByRole('columnheader')).toHaveLength(within(second!).getAllByRole('columnheader').length);
  });

  it('export sits next to the period control', () => {
    render(
      <SlaReports rows={rows} historyStart={historyStart} now={now} onExport={vi.fn()} onExportPdf={vi.fn()} controls={<div role="group" aria-label="History period" />} />,
    );
    const toolbar = screen.getByRole('group', { name: 'History period' }).parentElement!;
    expect(within(toolbar).getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Export PDF' })).toBeInTheDocument();
  });

  it('an empty install shows an empty state, not an empty table', () => {
    render(<SlaReports rows={[]} historyStart={null} now={now} onExport={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Nothing to report yet' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull();
  });
});
