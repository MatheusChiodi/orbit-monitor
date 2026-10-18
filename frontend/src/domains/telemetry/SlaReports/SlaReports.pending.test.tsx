import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { SlaReports, type SlaRow } from './SlaReports';
import { coverage, slaToCsv, uptimePercent } from './sla';

const HOUR = 3_600_000;
const now = new Date(2026, 9, 18, 17, 0, 0);
const historyStart = new Date(now.getTime() - 24 * HOUR).toISOString();

const rows: SlaRow[] = [
  { id: 'reconciliation', name: 'Reconciliation queue', groupName: 'Payments', uptime: 99.12, downMs: 12 * 60_000, incidents: 2 },
  { id: 'checkout', name: 'Checkout API', groupName: 'Payments', uptime: 100, downMs: 0, incidents: 0 },
];

describe('FE-43 SLA reports', () => {
  describe('uptimePercent (pure)', () => {
    it('down time over the measured time, excluding maintenance', () => {
      expect(uptimePercent({ measuredMs: 24 * HOUR, downMs: 36 * 60_000, maintenanceMs: 0 })).toBeCloseTo(97.5);
      expect(uptimePercent({ measuredMs: 24 * HOUR, downMs: 36 * 60_000, maintenanceMs: 12 * HOUR })).toBeCloseTo(95);
    });
    it('no measured time means no number, not 100%', () => {
      expect(uptimePercent({ measuredMs: 0, downMs: 0, maintenanceMs: 0 })).toBeNull();
    });
  });

  describe('coverage (pure)', () => {
    it('states how much of the requested period is actually in memory', () => {
      expect(coverage({ requestedMs: 7 * 24 * HOUR, historyStart, now })).toEqual({ availableMs: 24 * HOUR, complete: false, ratio: 1 / 7 });
      expect(coverage({ requestedMs: 24 * HOUR, historyStart, now }).complete).toBe(true);
    });
  });

  it('always states the available history window', () => {
    render(<SlaReports rows={rows} historyStart={historyStart} now={now} onExport={vi.fn()} />);
    expect(screen.getByText('History available: last 24 h')).toBeInTheDocument();
  });

  it('shows uptime per monitor in a table, grouped and formatted', () => {
    render(<SlaReports rows={rows} historyStart={historyStart} now={now} onExport={vi.fn()} />);
    const table = screen.getByRole('table', { name: 'Uptime by monitor' });
    const cells = within(table).getAllByRole('row')[1]!;
    expect(cells).toHaveTextContent('Reconciliation queue');
    expect(cells).toHaveTextContent('99.12%');
    expect(cells).toHaveTextContent('12min 00s');
  });

  it('a 7 d period beyond the window is flagged as partial, never shown as complete', async () => {
    render(<SlaReports rows={rows} historyStart={historyStart} now={now} onExport={vi.fn()} />);
    await userEvent.click(screen.getByRole('radio', { name: '7 d' }));
    expect(screen.getByRole('status')).toHaveTextContent('Only the last 24 h are available; 7 d uptime would be incomplete.');
    expect(screen.getByRole('table', { name: 'Uptime by monitor' })).toHaveAttribute('data-partial', 'true');
    expect(screen.queryByText(/7 d uptime: /)).toBeNull();
  });

  it('exports CSV with the window in the header', async () => {
    const onExport = vi.fn();
    render(<SlaReports rows={rows} historyStart={historyStart} now={now} onExport={onExport} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(onExport).toHaveBeenCalledWith(expect.stringContaining('# history available: last 24 h'), 'text/csv');
  });

  it('CSV export applies the same redaction', () => {
    const leak: SlaRow = { ...rows[0]!, name: 'Card 4111 1111 1111 1111 refunds' };
    const csv = slaToCsv([leak], { historyHours: 24 });
    expect(csv).not.toMatch(/4111\s?1111\s?1111\s?1111/);
    expect(csv).toContain('•••• •••• •••• 1111');
  });

  it('no data yet (fresh start, memory empty)', () => {
    render(<SlaReports rows={[]} historyStart={null} now={now} onExport={vi.fn()} />);
    expect(screen.getByText('No history yet. Orbit keeps the last 24 h in memory; it restarts empty.')).toBeInTheDocument();
  });

  it('a card number never reaches the table', () => {
    render(<SlaReports rows={[{ ...rows[0]!, name: '4111 1111 1111 1111' }]} historyStart={historyStart} now={now} onExport={vi.fn()} />);
    expect(document.body.textContent).not.toMatch(/4111\s?1111\s?1111\s?1111/);
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<SlaReports rows={rows} historyStart={historyStart} now={now} onExport={vi.fn()} />, 'pt-BR');
    expect(screen.getByText('Histórico disponível: últimas 24 h')).toBeInTheDocument();
    expect(screen.getByText('99,12%')).toBeInTheDocument();
  });
});
