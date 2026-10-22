import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IncidentPage, type IncidentDetail } from './IncidentPage';

const now = new Date(2026, 9, 18, 17, 10, 0);
const incident: IncidentDetail = {
  id: 'inc-1',
  monitorId: 'm',
  monitorName: 'Checkout',
  groupName: 'Payments',
  severity: 'DOWN',
  openedAt: new Date(2026, 9, 18, 17, 5).toISOString(),
  resolvedAt: null,
  acknowledgedBy: null,
  acknowledgedAt: null,
  ticket: null,
  impact: [],
  escalatesAt: new Date(2026, 9, 18, 17, 18).toISOString(),
  events: [],
  comments: [{ id: 'c1', at: now.toISOString(), author: 'Ana', text: 'on it' }],
};

function setup(mode: 'edit' | 'view-only', overrides: Partial<IncidentDetail> = {}) {
  const handlers = { onAcknowledge: vi.fn(), onComment: vi.fn(), onLinkTicket: vi.fn(), onResolve: vi.fn(), onReopen: vi.fn() };
  render(<IncidentPage incident={{ ...incident, ...overrides }} now={now} mode={mode} nextStep="Call DBA" {...handlers} />);
  return handlers;
}

describe('FE-39 incident actions by access mode (BE-26)', () => {
  it('editors resolve an open incident and reopen a resolved one', async () => {
    const h = setup('edit');
    await userEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    expect(h.onResolve).toHaveBeenCalledWith('inc-1');
    expect(screen.queryByRole('button', { name: 'Reopen' })).toBeNull();
  });

  it('a resolved incident can be reopened by an editor', async () => {
    const h = setup('edit', { resolvedAt: now.toISOString() });
    await userEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(h.onReopen).toHaveBeenCalledWith('inc-1');
  });

  it('view-only clients may only acknowledge: no resolve, comment or ticket controls (comments stay readable)', () => {
    setup('view-only');
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve' })).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Comment' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add comment' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Link ticket' })).toBeNull();
    expect(screen.getByText('on it')).toBeInTheDocument();
  });

  it('FE-40: the escalation countdown names the next step', () => {
    setup('edit');
    expect(screen.getByText(/Escalates in 08:00/)).toBeInTheDocument();
    expect(screen.getByText(/Call DBA/)).toBeInTheDocument();
  });
});
