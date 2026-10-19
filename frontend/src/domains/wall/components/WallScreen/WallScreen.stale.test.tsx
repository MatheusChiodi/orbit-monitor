import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '../../mock';
import { WallScreen } from './WallScreen';

const now = new Date(2026, 9, 18, 17, 10, 0);
const ago = (s: number) => new Date(now.getTime() - s * 1000).toISOString();

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('FE-46 stale wall', () => {
  it('greys out and says so after 60 s without updates', () => {
    const { container } = render(
      <WallScreen snapshot={mockSnapshot('incident', now)} now={now} connection="closed" updatedAt={ago(150)} freshEventIds={new Set()} onAcknowledge={vi.fn()} />,
    );
    expect(container.querySelector('.wall-root')).toHaveAttribute('data-stale', 'true');
    expect(screen.getByText('Stale data · last update 2min 30s ago')).toBeInTheDocument();
  });

  it('fresh data is not stale', () => {
    const { container } = render(
      <WallScreen snapshot={mockSnapshot('incident', now)} now={now} connection="open" updatedAt={ago(5)} freshEventIds={new Set()} onAcknowledge={vi.fn()} />,
    );
    expect(container.querySelector('.wall-root')).toHaveAttribute('data-stale', 'false');
  });

  it('demo data never goes stale', () => {
    const { container } = render(
      <WallScreen snapshot={mockSnapshot('incident', now)} now={now} connection="mock" updatedAt={ago(600)} freshEventIds={new Set()} onAcknowledge={vi.fn()} />,
    );
    expect(container.querySelector('.wall-root')).toHaveAttribute('data-stale', 'false');
  });
});
