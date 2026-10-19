import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { entersAnimated, flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import { mockSnapshot } from '../../mock';
import { WallScreen } from './WallScreen';

const now = new Date(2026, 9, 18, 17, 10, 0);

function wall(scenario: 'incident' | 'ok') {
  return (
    <WallScreen
      snapshot={mockSnapshot(scenario, now)}
      now={now}
      connection="open"
      freshEventIds={new Set()}
      onAcknowledge={vi.fn()}
    />
  );
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('FE-51 WallScreen motion', () => {
  it('standard: the hero swap keeps the old hero briefly (layoutId cross-fade)', async () => {
    const { rerender } = renderWithMotion(wall('ok'), 'standard');
    rerender(wall('incident'));
    expect(screen.queryByRole('heading', { name: 'All systems operational' })).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Reconciliation queue' })).toBeInTheDocument();
    await flushMotion(600);
    expect(screen.queryByRole('heading', { name: 'All systems operational' })).toBeNull();
  });

  it('off: the hero swaps at once', async () => {
    const { rerender } = renderWithMotion(wall('ok'), 'off');
    rerender(wall('incident'));
    await flushMotion();
    expect(screen.queryByRole('heading', { name: 'All systems operational' })).toBeNull();
  });

  it('standard: panels enter animated; off: static', () => {
    const std = renderWithMotion(wall('incident'), 'standard');
    expect(entersAnimated(screen.getByRole('region', { name: 'Timeline' }))).toBe(true);
    std.unmount();
    renderWithMotion(wall('incident'), 'off');
    expect(isStatic(screen.getByRole('region', { name: 'Timeline' }))).toBe(true);
  });

  it('a loading wall is replaced by content with a cross-fade (skeleton first)', () => {
    const { rerender } = renderWithMotion(
      <WallScreen snapshot={null} now={now} connection="connecting" freshEventIds={new Set()} onAcknowledge={vi.fn()} />,
      'standard',
    );
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(skeleton).toHaveAttribute('data-skeleton');
    rerender(wall('incident'));
    expect(screen.getByRole('region', { name: 'Situation' })).toBeInTheDocument();
  });

  it('prefers-reduced-motion forces off everywhere', () => {
    renderWithMotion(wall('incident'), 'expressive', 'en', { reducedMotion: true });
    for (const name of ['Situation', 'Also active', 'Near threshold', 'All monitors', 'Timeline']) {
      expect(screen.getByRole('region', { name })).toHaveAttribute('data-motion-level', 'off');
    }
  });
});
