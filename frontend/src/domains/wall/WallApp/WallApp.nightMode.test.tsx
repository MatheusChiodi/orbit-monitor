import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '../mock';
import { WallApp } from './WallApp';

const hhmm = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

/** A two-hour window around the real clock (the wall reads the current time). */
function scheduleAroundNow() {
  const real = Date.now();
  return { enabled: true, from: hhmm(new Date(real - 3_600_000)), to: hhmm(new Date(real + 3_600_000)), dimTo: 0.6 };
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

const offline = () => ({ getWallSnapshot: vi.fn().mockRejectedValue(new Error('offline')), acknowledgeIncident: vi.fn() });

describe('FE-09 night mode on the wall', () => {
  it('dims a calm wall inside the schedule', async () => {
    render(<WallApp api={offline()} connect={vi.fn()} operator="Ana" mock={() => mockSnapshot('ok')} nightMode={scheduleAroundNow()} />);
    expect(await screen.findByTestId('night-mode')).toBeInTheDocument();
    expect(screen.getByText('Night mode')).toBeInTheDocument();
  });

  it('an unacknowledged DOWN incident keeps the wall at full brightness', async () => {
    render(<WallApp api={offline()} connect={vi.fn()} operator="Ana" mock={() => mockSnapshot('incident')} nightMode={scheduleAroundNow()} />);
    expect(await screen.findByRole('button', { name: 'Acknowledge' })).toBeInTheDocument();
    expect(screen.queryByTestId('night-mode')).toBeNull();
  });
});
