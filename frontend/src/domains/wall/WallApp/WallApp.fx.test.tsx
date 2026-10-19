import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '../mock';
import { WallApp } from './WallApp';

const now = new Date(2026, 9, 18, 17, 10, 0);

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

function renderWall(scenario: 'ok' | 'incident') {
  const api = { getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')), acknowledgeIncident: vi.fn() };
  return render(<WallApp api={api} connect={vi.fn()} operator="M. Chiodi" mock={() => mockSnapshot(scenario, now)} />);
}

describe('FE-52 wall FX', () => {
  it('draws the FX backdrop behind the wall, hidden from assistive tech', async () => {
    const { container } = renderWall('ok');
    const heading = await screen.findByRole('heading', { name: 'All systems operational' });
    const backdrop = container.querySelector('.fx-backdrop');
    expect(backdrop).not.toBeNull();
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(backdrop?.contains(heading)).toBe(false);
  });

  it('an unacknowledged DOWN pauses the background; acknowledging resumes it', async () => {
    const { container } = renderWall('incident');
    await screen.findByText('demo data');
    expect(container.querySelector('.fx-backdrop')).toHaveAttribute('data-paused', 'true');
    for (let i = 0; i < 5; i++) {
      const button = screen.queryAllByRole('button', { name: 'Acknowledge' })[0];
      if (!button) break;
      await userEvent.click(button);
    }
    await waitFor(() => expect(container.querySelector('.fx-backdrop')).not.toHaveAttribute('data-paused'));
  });
});
