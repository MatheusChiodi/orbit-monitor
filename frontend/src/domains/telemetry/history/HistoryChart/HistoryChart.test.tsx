import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { chartGeometry, nearestIndex, valueTicks } from './chartGeometry';
import { HistoryChart } from './HistoryChart';

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 24, 10, minutes));
const points = [
  { at: at(0), value: 120 },
  { at: at(10), value: 180 },
  { at: at(20), value: null },
  { at: at(30), value: 260 },
];
const box = { width: 600, height: 200, left: 48, right: 8, top: 8, bottom: 24 };

describe('history chart geometry', () => {
  it('value ticks are round and cover the readings and the limit', () => {
    const ticks = valueTicks([120, 180, 260], 200);
    expect(ticks[0]).toBeLessThanOrEqual(120);
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(260);
    expect(ticks.every((t) => Number.isInteger(t / 50) || Number.isInteger(t / 20) || Number.isInteger(t / 100))).toBe(true);
  });

  it('a missing value breaks the line', () => {
    expect(chartGeometry(points, null, box).segments.map((s) => s.length)).toEqual([2, 1]);
  });

  it('the limit is drawn inside the plot', () => {
    const g = chartGeometry(points, 200, box);
    expect(g.limitY).toBeGreaterThan(box.top);
    expect(g.limitY).toBeLessThan(box.height - box.bottom);
  });

  it('finds the nearest point to the pointer', () => {
    expect(nearestIndex([10, 50, 90], 62)).toBe(1);
  });
});

describe('HistoryChart', () => {
  it('is a labelled chart with value and time axes and the limit', () => {
    render(<HistoryChart points={points} limit={200} unit="ms" label="Shop over the selected period" status="WARN" />);
    expect(screen.getByRole('img', { name: /Shop over the selected period/ })).toBeInTheDocument();
    expect(screen.getByText('Limit 200 ms')).toBeInTheDocument();
    expect(screen.getAllByTestId('y-tick').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByTestId('x-tick').length).toBeGreaterThanOrEqual(2);
  });

  it('pointer and arrow keys show the value at a time', () => {
    render(<HistoryChart points={points} limit={null} unit="ms" label="Shop" status="OK" />);
    const chart = screen.getByRole('img', { name: /Shop/ });
    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: 'End' });
    expect(screen.getByRole('tooltip')).toHaveTextContent('260 ms');
    fireEvent.keyDown(chart, { key: 'ArrowLeft' });
    expect(screen.getByRole('tooltip')).toHaveTextContent('no data');
  });
});
