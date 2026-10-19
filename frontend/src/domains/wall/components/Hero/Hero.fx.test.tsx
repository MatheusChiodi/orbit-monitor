import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MonitorView } from '@/shared/api/types';
import { mockSnapshot } from '../../mock';
import { pickHero } from '../../selectors';
import { Hero } from './Hero';

const now = new Date(2026, 9, 18, 17, 10, 0);

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

function selection(status: MonitorView['status']) {
  const hero = pickHero(mockSnapshot('incident', now));
  if (!hero) throw new Error('scenario without a hero');
  return { ...hero, monitor: { ...hero.monitor, status } };
}

describe('FE-52 Hero glow', () => {
  it('DOWN: restrained red glow on the hero edge', () => {
    render(<Hero selection={selection('DOWN')} now={now} onAcknowledge={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Situation' })).toHaveClass('fx-down-glow');
  });

  it('WARN: no glow', () => {
    render(<Hero selection={selection('WARN')} now={now} onAcknowledge={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'Situation' })).not.toHaveClass('fx-down-glow');
  });
});
