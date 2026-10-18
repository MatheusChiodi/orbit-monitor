import { render, screen } from '@testing-library/react';
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
});
