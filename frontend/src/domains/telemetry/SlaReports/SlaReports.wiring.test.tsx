import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SlaReports, type SlaRow } from './SlaReports';

const HOUR = 3_600_000;
const now = new Date(2026, 9, 18, 17, 0, 0);
const rows: SlaRow[] = [{ id: 'm', name: 'Checkout API', groupName: 'Payments', uptime: 99.5, downMs: 60_000, incidents: 1 }];

describe('FE-43 SLA reports wired to the history store', () => {
  it('a controlled period reports changes so the screen can fetch that range', async () => {
    const onPeriodChange = vi.fn();
    render(<SlaReports rows={rows} historyStart={new Date(now.getTime() - 10 * 24 * HOUR).toISOString()} now={now} onExport={vi.fn()} period="24h" onPeriodChange={onPeriodChange} windowHours={720} />);
    await userEvent.click(screen.getByRole('radio', { name: '7 d' }));
    expect(onPeriodChange).toHaveBeenCalledWith('7d');
    expect(screen.getByRole('radio', { name: '24 h' })).toBeChecked();
  });

  it('with the 30-day store a 7 d period inside the coverage is complete', () => {
    render(<SlaReports rows={rows} historyStart={new Date(now.getTime() - 10 * 24 * HOUR).toISOString()} now={now} onExport={vi.fn()} period="7d" windowHours={720} />);
    expect(screen.getByRole('table', { name: 'Uptime by monitor' }).closest('[data-partial]')).toHaveAttribute('data-partial', 'false');
    expect(screen.getByText('History available: last 168 h')).toBeInTheDocument();
  });

  it('Export PDF hands the rows and the window to the screen', async () => {
    const onExportPdf = vi.fn();
    render(<SlaReports rows={rows} historyStart={new Date(now.getTime() - 24 * HOUR).toISOString()} now={now} onExport={vi.fn()} onExportPdf={onExportPdf} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
    expect(onExportPdf).toHaveBeenCalledWith(rows, { historyHours: 24, period: '24 h' });
  });
});
