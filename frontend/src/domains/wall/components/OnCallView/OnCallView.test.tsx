import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { mockSnapshot } from '../../mock';
import { OnCallView } from './OnCallView';

const now = new Date(2026, 9, 18, 17, 10, 0);

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('FE-49 mobile on-call view', () => {
  it('shows the hero, the active incidents and a full-width Acknowledge button', () => {
    render(<OnCallView snapshot={mockSnapshot('incident', now)} now={now} onAcknowledge={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Reconciliation queue' })).toBeInTheDocument();
    const active = screen.getByRole('region', { name: 'Active incidents' });
    expect(within(active).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Acknowledge' }).className).toContain('w-full');
  });

  it('does not render the matrix or the timeline (focus on action)', () => {
    render(<OnCallView snapshot={mockSnapshot('incident', now)} now={now} onAcknowledge={vi.fn()} />);
    expect(screen.queryByRole('region', { name: 'All monitors' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Timeline' })).toBeNull();
  });

  it('acknowledging calls back with the incident id', async () => {
    const onAcknowledge = vi.fn();
    render(<OnCallView snapshot={mockSnapshot('incident', now)} now={now} onAcknowledge={onAcknowledge} />);
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(onAcknowledge).toHaveBeenCalledWith('inc-reconciliation');
  });

  it('touch targets are at least 2.75 rem tall', () => {
    render(<OnCallView snapshot={mockSnapshot('incident', now)} now={now} onAcknowledge={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Acknowledge' }).className).toContain('min-h-11');
  });

  it('calm state when nothing is wrong', () => {
    render(<OnCallView snapshot={mockSnapshot('ok', now)} now={now} onAcknowledge={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'All systems operational' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull();
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<OnCallView snapshot={mockSnapshot('incident', now)} now={now} onAcknowledge={vi.fn()} />, 'pt-BR');
    expect(screen.getByRole('region', { name: 'Incidentes ativos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reconhecer' })).toBeInTheDocument();
  });

  it('fresh install: "No monitors yet", never "All systems operational"', () => {
    const empty = { ...mockSnapshot('ok', now), monitors: [], groups: [], incidents: [], timeline: [] };
    render(<OnCallView snapshot={empty} now={now} onAcknowledge={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'No monitors yet' })).toBeInTheDocument();
    expect(screen.queryByText('All systems operational')).toBeNull();
  });
});
