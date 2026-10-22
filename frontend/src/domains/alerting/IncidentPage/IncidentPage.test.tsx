import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { IncidentPage, type IncidentDetail } from './IncidentPage';

const now = new Date(2026, 9, 18, 17, 10, 0);
const incident: IncidentDetail = {
  id: 'inc-reconciliation',
  monitorId: 'reconciliation',
  monitorName: 'Reconciliation queue',
  groupName: 'Payments',
  severity: 'DOWN',
  openedAt: new Date(2026, 9, 18, 17, 5, 59).toISOString(),
  resolvedAt: null,
  acknowledgedBy: null,
  acknowledgedAt: null,
  ticket: null,
  impact: ['Checkout'],
  escalatesAt: null,
  events: [
    { id: 'e1', at: new Date(2026, 9, 18, 17, 5, 59).toISOString(), kind: 'DOWN', title: 'Reconciliation queue down', detail: 'QTY = 349 · rule QTY < 200' },
  ],
  comments: [{ id: 'c1', at: new Date(2026, 9, 18, 17, 7).toISOString(), author: 'R. Lima', text: 'Looking at the batch job.' }],
};

function setup(overrides: Partial<IncidentDetail> = {}, mode: 'edit' | 'view-only' = 'edit') {
  const handlers = { onAcknowledge: vi.fn(), onComment: vi.fn(), onLinkTicket: vi.fn() };
  render(<IncidentPage incident={{ ...incident, ...overrides }} now={now} mode={mode} {...handlers} />);
  return handlers;
}

describe('FE-39 incident page', () => {
  it('shows identification, state label, elapsed time and timeline', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Reconciliation queue' })).toBeInTheDocument();
    expect(screen.getByText('DOWN')).toBeInTheDocument();
    expect(screen.getByText('4min 01s ago')).toBeInTheDocument();
    const timeline = screen.getByRole('list', { name: 'Timeline' });
    expect(timeline).toHaveTextContent('QTY = 349 · rule QTY < 200');
  });

  it('acknowledge, then shows who and when', async () => {
    const h = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(h.onAcknowledge).toHaveBeenCalledWith('inc-reconciliation');
  });

  it('comments show the self-declared operator name', async () => {
    const h = setup();
    expect(screen.getByText('R. Lima (self-declared)')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Comment' }), 'Restarted the job');
    await userEvent.click(screen.getByRole('button', { name: 'Add comment' }));
    expect(h.onComment).toHaveBeenCalledWith('inc-reconciliation', 'Restarted the job');
  });

  it('links an external ticket', async () => {
    const h = setup();
    await userEvent.type(screen.getByRole('textbox', { name: 'Ticket' }), 'INC-4821');
    await userEvent.click(screen.getByRole('button', { name: 'Link ticket' }));
    expect(h.onLinkTicket).toHaveBeenCalledWith('inc-reconciliation', 'INC-4821');
  });

  it('view-only clients can acknowledge, but neither comment nor edit the ticket link (BE-26 access rule)', () => {
    setup({}, 'view-only');
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add comment' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Link ticket' })).toBeNull();
  });

  it('a resolved incident shows the postmortem with MTTA and MTTR', () => {
    setup({
      acknowledgedBy: 'R. Lima',
      acknowledgedAt: new Date(2026, 9, 18, 17, 8).toISOString(),
      resolvedAt: new Date(2026, 9, 18, 17, 20).toISOString(),
    });
    const postmortem = screen.getByRole('region', { name: 'Postmortem' });
    expect(within(postmortem).getByText('Time to acknowledge')).toBeInTheDocument();
    expect(postmortem).toHaveTextContent('2min 01s');
    expect(postmortem).toHaveTextContent('14min 01s');
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull();
  });

  it('values from the probe are masked (PAN never in the DOM)', () => {
    setup({
      events: [{ id: 'e2', at: now.toISOString(), kind: 'DOWN', title: 'Stuck payment', detail: 'PAN = 4111 1111 1111 1111' }],
    });
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/4111\s?1111\s?1111\s?1111/);
    expect(text).toContain('•••• •••• •••• 1111');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(
      <IncidentPage incident={incident} now={now} mode="edit" onAcknowledge={vi.fn()} onComment={vi.fn()} onLinkTicket={vi.fn()} />,
      'pt-BR',
    );
    expect(screen.getByText('FORA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reconhecer' })).toBeInTheDocument();
    expect(screen.getByText('R. Lima (autodeclarado)')).toBeInTheDocument();
  });
});
