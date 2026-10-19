import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { LineChart } from './LineChart';

const points = [
  { at: '2026-10-18T16:00:00Z', value: 120 },
  { at: '2026-10-18T17:00:00Z', value: 182 },
];
const data = { label: 'Latency', unit: 'ms', status: 'OK' as const, historyHours: 24, points };

describe('FE-25 week-over-week overlay on the line chart', () => {
  it('without a week of history shows an explanatory note instead of a ghost line', () => {
    const { container } = render(<LineChart data={data} overlay="week-over-week" />);
    expect(container.querySelector('[data-series="previous-week"]')).toBeNull();
    expect(screen.getByText('Last week is not available: history covers only the last 24 h')).toBeInTheDocument();
  });

  it('draws last week as a ghost line with a legend when history exists', () => {
    const previous = [
      { at: '2026-10-18T16:00:00Z', value: 100 },
      { at: '2026-10-18T17:00:00Z', value: 110 },
    ];
    const { container } = render(
      <LineChart data={{ ...data, historyHours: 24 * 8, previousWeek: previous }} overlay="week-over-week" />,
    );
    expect(container.querySelector('[data-series="previous-week"]')).not.toBeNull();
    expect(screen.getByText('Same period last week')).toBeInTheDocument();
  });

  it('the note is translated to pt-BR', () => {
    renderWithLocale(<LineChart data={data} overlay="week-over-week" />, 'pt-BR');
    expect(screen.getByText('Semana passada indisponível: o histórico cobre só as últimas 24 h')).toBeInTheDocument();
  });
});
