import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroCalm } from './HeroCalm';

const now = new Date(2026, 9, 18, 17, 10, 0);

describe('HeroCalm', () => {
  it('"Tudo operacional" com disponibilidade, última recuperação e perto do limite', () => {
    render(
      <HeroCalm uptime24h={99.97} lastRecoveryAt={new Date(2026, 9, 18, 15, 35).toISOString()} nearLimitCount={3} now={now} />,
    );
    const region = screen.getByRole('region', { name: 'Situação' });
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('heading', { name: 'Tudo operacional' })).toBeInTheDocument();
    expect(screen.getByText('99,97%')).toBeInTheDocument();
    expect(screen.getByText('há 1 h')).toBeInTheDocument();
    expect(screen.getByText('3 monitores')).toBeInTheDocument();
  });

  it('sem recuperação registrada e singular', () => {
    render(<HeroCalm uptime24h={100} lastRecoveryAt={null} nearLimitCount={1} now={now} />);
    expect(screen.getByText('nenhuma')).toBeInTheDocument();
    expect(screen.getByText('1 monitor')).toBeInTheDocument();
  });
});
