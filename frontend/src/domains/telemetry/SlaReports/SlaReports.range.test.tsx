import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SlaReports, type SlaRow } from './SlaReports';

const now = new Date(2026, 9, 18, 17, 0, 0);
const rows: SlaRow[] = [{ id: 'm', name: 'Checkout', groupName: 'Payments', uptime: 99.5, downMs: 60_000, incidents: 1 }];

describe('FE-58 one period control on the SLA screen', () => {
  it('a period control from the screen replaces the built-in radios and drives the requested period', () => {
    render(
      <SlaReports
        rows={rows}
        historyStart={new Date(now.getTime() - 2 * 86_400_000).toISOString()}
        now={now}
        onExport={vi.fn()}
        windowHours={720}
        controls={<div role="group" aria-label="History period" />}
        coverageNote={<p>History available: last 30 days</p>}
        requested={{ hours: 168, label: '7 d' }}
      />,
    );
    expect(screen.queryByRole('radiogroup', { name: 'Period' })).toBeNull();
    expect(screen.getByRole('group', { name: 'History period' })).toBeInTheDocument();
    expect(screen.getByText('History available: last 30 days')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('7 d uptime would be incomplete');
    expect(screen.getByRole('table', { name: 'Uptime by monitor' })).toHaveAttribute('data-partial', 'true');
  });
});
