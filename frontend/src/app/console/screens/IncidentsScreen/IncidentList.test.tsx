import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { IncidentRecord } from '@/shared/api/consoleTypes';
import { renderWithLocale } from '@/test/renderWithLocale';
import { countByFilter, matchesFilter, sortIncidents } from './incidentFilters';
import { IncidentList } from './IncidentList';

const now = new Date(2026, 9, 24, 12, 0);
const base = { severity: 'DOWN' as const, ticket: null, events: [], acknowledgedAt: null, acknowledgedBy: null, resolvedAt: null };
const incidents: IncidentRecord[] = [
  { ...base, id: 'i-open', monitorId: 'api', status: 'OPEN', openedAt: new Date(2026, 9, 24, 11, 50).toISOString() },
  {
    ...base,
    id: 'i-ack',
    monitorId: 'db',
    status: 'OPEN',
    severity: 'WARN',
    openedAt: new Date(2026, 9, 24, 11, 0).toISOString(),
    acknowledgedBy: 'loopback',
    acknowledgedAt: new Date(2026, 9, 24, 11, 5).toISOString(),
  },
  {
    ...base,
    id: 'i-done',
    monitorId: 'api',
    status: 'RESOLVED',
    openedAt: new Date(2026, 9, 24, 9, 0).toISOString(),
    resolvedAt: new Date(2026, 9, 24, 9, 12).toISOString(),
  },
];
const names = new Map([
  ['api', 'Checkout API'],
  ['db', 'Orders DB'],
]);

function setup(props: Partial<Parameters<typeof IncidentList>[0]> = {}) {
  const handlers = { onAcknowledge: vi.fn(), onResolve: vi.fn() };
  render(<IncidentList incidents={incidents} names={names} now={now} editable filter="all" onFilterChange={vi.fn()} {...handlers} {...props} />);
  return handlers;
}

describe('FE-39 incident filters (pure)', () => {
  it('open = not acknowledged; acknowledged = open and acknowledged; resolved = closed', () => {
    expect(incidents.filter((i) => matchesFilter(i, 'open')).map((i) => i.id)).toEqual(['i-open']);
    expect(incidents.filter((i) => matchesFilter(i, 'acknowledged')).map((i) => i.id)).toEqual(['i-ack']);
    expect(incidents.filter((i) => matchesFilter(i, 'resolved')).map((i) => i.id)).toEqual(['i-done']);
    expect(countByFilter(incidents)).toEqual({ all: 3, open: 1, acknowledged: 1, resolved: 1 });
  });

  it('open incidents come first, newest first', () => {
    expect(sortIncidents([...incidents].reverse()).map((i) => i.id)).toEqual(['i-open', 'i-ack', 'i-done']);
  });
});

describe('FE-39 incident list', () => {
  it('filters by state with a segmented control', async () => {
    const onFilterChange = vi.fn();
    setup({ onFilterChange });
    await userEvent.click(screen.getByRole('radio', { name: /Resolved/ }));
    expect(onFilterChange).toHaveBeenCalledWith('resolved');
  });

  it('shows only the incidents of the active filter', () => {
    setup({ filter: 'resolved' });
    const list = screen.getByRole('list', { name: 'Incidents' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(list).toHaveTextContent('Resolved at 09:12 · lasted 12min 00s');
  });

  it('acknowledges and resolves from the list; Acknowledge is never the danger color', async () => {
    const h = setup();
    const ack = screen.getByRole('button', { name: 'Acknowledge Checkout API' });
    expect(ack.className).not.toMatch(/bg-down/);
    await userEvent.click(ack);
    expect(h.onAcknowledge).toHaveBeenCalledWith('i-open');
    await userEvent.click(screen.getByRole('button', { name: 'Resolve Orders DB' }));
    expect(h.onResolve).toHaveBeenCalledWith('i-ack');
    expect(screen.getByText('Acknowledged at 11:05')).toBeInTheDocument();
  });

  it('view-only clients may acknowledge but not resolve', () => {
    setup({ editable: false });
    expect(screen.getByRole('button', { name: 'Acknowledge Checkout API' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Resolve/ })).toBeNull();
  });

  it('an empty filter invites instead of showing a blank list', () => {
    setup({ incidents: [], filter: 'all' });
    expect(screen.getByRole('heading', { name: 'No incidents yet' })).toBeInTheDocument();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(
      <IncidentList incidents={incidents} names={names} now={now} editable filter="all" onFilterChange={vi.fn()} onAcknowledge={vi.fn()} onResolve={vi.fn()} />,
      'pt-BR',
    );
    expect(screen.getByRole('radio', { name: /Resolvidos/ })).toBeInTheDocument();
    expect(screen.getByText('Resolvido às 09:12 · durou 12min 00s')).toBeInTheDocument();
  });
});
