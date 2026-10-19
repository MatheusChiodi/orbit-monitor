import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { STALE_AFTER_MS, isStale } from './staleness';
import { StaleBadge } from './StaleBadge';

const now = new Date(2026, 9, 18, 17, 10, 0);
const secondsAgo = (s: number) => new Date(now.getTime() - s * 1000).toISOString();

describe('FE-46 stale data indicator', () => {
  it('data is stale after the configured time without updates', () => {
    expect(STALE_AFTER_MS).toBe(60_000);
    expect(isStale(secondsAgo(30), now)).toBe(false);
    expect(isStale(secondsAgo(61), now)).toBe(true);
    expect(isStale(null, now)).toBe(true);
    expect(isStale(secondsAgo(10), now, 5_000)).toBe(true);
  });

  it('shows the data age as text, not only as color', () => {
    render(<StaleBadge updatedAt={secondsAgo(12)} now={now} />);
    expect(screen.getByText('data 12s old')).toBeInTheDocument();
  });

  it('when stale it announces it and greys out the wall', () => {
    const { container } = render(<StaleBadge updatedAt={secondsAgo(150)} now={now} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Stale data · last update 2min 30s ago');
    expect(container.firstElementChild).toHaveAttribute('data-stale', 'true');
  });

  it('no update ever received', () => {
    render(<StaleBadge updatedAt={null} now={now} />);
    expect(screen.getByRole('status')).toHaveTextContent('No data received yet');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<StaleBadge updatedAt={secondsAgo(150)} now={now} />, 'pt-BR');
    expect(screen.getByRole('status')).toHaveTextContent('Dados desatualizados · última atualização há 2min 30s');
  });
});
