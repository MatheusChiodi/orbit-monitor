import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createChartSyncStore } from '../chartSync';
import { LineChart } from './LineChart';

const points = [
  { at: new Date(2026, 9, 18, 17, 0).toISOString(), value: 120 },
  { at: new Date(2026, 9, 18, 17, 5).toISOString(), value: 182 },
  { at: new Date(2026, 9, 18, 17, 10).toISOString(), value: 150 },
];

describe('FE-27 synced crosshair on line charts', () => {
  it('moving the crosshair on one chart shows the same time on the other charts of the group', async () => {
    const sync = createChartSyncStore();
    render(
      <>
        <LineChart data={{ label: 'Latency', unit: 'ms', status: 'OK', historyHours: 24, points }} syncGroup="page" sync={sync} />
        <LineChart data={{ label: 'Errors', status: 'OK', historyHours: 24, points }} syncGroup="page" sync={sync} />
      </>,
    );
    const latency = screen.getByRole('img', { name: /Latency/ });
    latency.focus();
    await userEvent.keyboard('{ArrowRight}');
    const errorsChart = screen.getByRole('img', { name: /Errors/ }).closest('[data-chart]')!;
    expect(within(errorsChart as HTMLElement).getByText('17:05')).toBeInTheDocument();
  });

  it('the crosshair readout is announced politely with value and time', async () => {
    const sync = createChartSyncStore();
    render(<LineChart data={{ label: 'Latency', unit: 'ms', status: 'OK', historyHours: 24, points }} syncGroup="page" sync={sync} />);
    screen.getByRole('img', { name: /Latency/ }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('status')).toHaveTextContent('17:05 · 182 ms');
  });

  it('Escape hides the crosshair', async () => {
    const sync = createChartSyncStore();
    render(<LineChart data={{ label: 'Latency', unit: 'ms', status: 'OK', historyHours: 24, points }} syncGroup="page" sync={sync} />);
    screen.getByRole('img', { name: /Latency/ }).focus();
    await userEvent.keyboard('{ArrowRight}{Escape}');
    expect(sync.getState().crosshair('page')).toBeNull();
  });
});
