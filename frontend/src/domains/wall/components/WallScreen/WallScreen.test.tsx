import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '../../mock';
import { WallScreen } from './WallScreen';

const now = new Date(2026, 9, 18, 17, 10, 0);

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

function renderWall(scenario: 'incident' | 'ok', onAcknowledge = vi.fn()) {
  return render(
    <WallScreen
      snapshot={mockSnapshot(scenario, now)}
      now={now}
      connection="open"
      freshEventIds={new Set()}
      onAcknowledge={onAcknowledge}
    />,
  );
}

describe('WallScreen', () => {
  it('with an incident: hero of the worst problem and every block', () => {
    renderWall('incident');
    expect(screen.getByRole('heading', { name: 'Reconciliation queue' })).toBeInTheDocument();
    for (const name of ['Situation', 'Also active', 'Near threshold', 'All monitors', 'Timeline']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('status')).toHaveTextContent('1 monitor down');
  });

  it('all ok: calm hero', () => {
    renderWall('ok');
    expect(screen.getByRole('heading', { name: 'All systems operational' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull();
  });

  it('Acknowledge passes the incident id', async () => {
    const onAcknowledge = vi.fn();
    renderWall('incident', onAcknowledge);
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(onAcknowledge).toHaveBeenCalledWith('inc-reconciliation');
  });

  it('FE-55: clicking a matrix tile runs its card action (default: open the incident in the console)', async () => {
    const onNavigate = vi.fn();
    render(
      <WallScreen snapshot={mockSnapshot('incident', now)} now={now} connection="open" freshEventIds={new Set()} onAcknowledge={vi.fn()} onNavigate={onNavigate} />,
    );
    const matrix = screen.getByRole('region', { name: 'All monitors' });
    const tiles = within(matrix).getAllByRole('button');
    const tile = tiles.find((el) => el.textContent?.includes('Reconciliation queue'));
    await userEvent.click(tile!);
    expect(onNavigate).toHaveBeenCalledWith('/index.html#/incidents/inc-reconciliation');
  });

  it('DOM block order follows the phone order', () => {
    renderWall('incident');
    const names = screen.getAllByRole('region').map((r) => r.getAttribute('aria-labelledby') && r.querySelector('h2')?.textContent);
    expect(names).toEqual(['Situation', 'Also active', 'Near threshold', 'All monitors', 'Timeline']);
  });

  it('shows loading without a snapshot', () => {
    render(
      <WallScreen snapshot={null} now={now} connection="connecting" freshEventIds={new Set()} onAcknowledge={vi.fn()} />,
    );
    expect(screen.getByText('Loading the wall…')).toBeInTheDocument();
  });

  it('without a snapshot and without a server, says it is waiting for Orbit instead of showing data', () => {
    render(<WallScreen snapshot={null} now={now} connection="closed" freshEventIds={new Set()} onAcknowledge={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for the Orbit server…');
  });
});
