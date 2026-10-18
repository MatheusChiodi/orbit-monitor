import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { HeroCalm } from './HeroCalm';

const now = new Date(2026, 9, 18, 17, 10, 0);
const recovery = new Date(2026, 9, 18, 15, 35).toISOString();

describe('HeroCalm', () => {
  it('"All systems operational" with availability, last recovery and near threshold', () => {
    render(<HeroCalm uptime24h={99.97} lastRecoveryAt={recovery} nearLimitCount={3} now={now} />);
    const region = screen.getByRole('region', { name: 'Situation' });
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('heading', { name: 'All systems operational' })).toBeInTheDocument();
    expect(screen.getByText('99.97%')).toBeInTheDocument();
    expect(screen.getByText('1 h ago')).toBeInTheDocument();
    expect(screen.getByText('3 monitors')).toBeInTheDocument();
  });

  it('pt-BR: "Tudo operacional", "99,97%", "há 1 h"', () => {
    renderWithLocale(<HeroCalm uptime24h={99.97} lastRecoveryAt={recovery} nearLimitCount={3} now={now} />, 'pt-BR');
    expect(screen.getByRole('heading', { name: 'Tudo operacional' })).toBeInTheDocument();
    expect(screen.getByText('99,97%')).toBeInTheDocument();
    expect(screen.getByText('há 1 h')).toBeInTheDocument();
    expect(screen.getByText('3 monitores')).toBeInTheDocument();
  });

  it('no recorded recovery and singular', () => {
    render(<HeroCalm uptime24h={100} lastRecoveryAt={null} nearLimitCount={1} now={now} />);
    expect(screen.getByText('none')).toBeInTheDocument();
    expect(screen.getByText('1 monitor')).toBeInTheDocument();
  });
});
