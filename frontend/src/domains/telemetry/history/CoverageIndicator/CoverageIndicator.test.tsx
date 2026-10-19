import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { presetRange, type StoreCoverage } from '../range';
import { CoverageIndicator } from './CoverageIndicator';

const NOW = new Date('2026-10-18T12:00:00Z');
const DAY = 86_400_000;

const coverage = (oldest: Date | null, rawWritesEnabled = true): StoreCoverage => ({
  oldest: oldest ? oldest.toISOString() : null,
  newest: NOW.toISOString(),
  retentionDays: 30,
  rawWritesEnabled,
});

describe('FE-58 history coverage indicator', () => {
  it('states the retention window and nothing else when the period is fully covered', () => {
    render(<CoverageIndicator coverage={coverage(new Date(NOW.getTime() - 40 * DAY))} range={presetRange('7d', NOW)} />);
    expect(screen.getByRole('note')).toHaveTextContent(/^History available: last 30 days$/);
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  });

  it('shows how much of a longer period is covered', () => {
    render(<CoverageIndicator coverage={coverage(new Date(NOW.getTime() - 3 * DAY))} range={presetRange('30d', NOW)} />);
    expect(screen.getByRole('note')).toHaveTextContent('Covers 10% of this period, since');
    expect(screen.getByRole('meter', { name: 'Share of the period with history' })).toHaveAttribute('aria-valuenow', '10');
  });

  it('says when nothing is stored and when raw writes are paused for low disk', () => {
    render(<CoverageIndicator coverage={coverage(null, false)} range={presetRange('24h', NOW)} />);
    expect(screen.getByRole('note')).toHaveTextContent('No history recorded for this period yet');
    expect(screen.getByRole('note')).toHaveTextContent('Low disk space: only summaries are being recorded');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(
      <CoverageIndicator coverage={coverage(new Date(NOW.getTime() - 3 * DAY))} range={presetRange('30d', NOW)} />,
      'pt-BR',
    );
    expect(screen.getByRole('note')).toHaveTextContent('Histórico disponível: últimos 30 dias');
    expect(screen.getByRole('note')).toHaveTextContent('Cobre 10% deste período');
  });
});
