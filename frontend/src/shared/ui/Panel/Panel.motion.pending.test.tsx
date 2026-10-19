import { screen } from '@testing-library/react';
import { AnimatePresence } from 'motion/react';
import { describe, expect, it } from 'vitest';
import { entersAnimated, flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import { Panel } from './Panel';

function Toggle({ show }: { show: boolean }) {
  return <AnimatePresence>{show && <Panel title="Near threshold">body</Panel>}</AnimatePresence>;
}

describe('FE-51 Panel motion', () => {
  it('standard: enters with fade + small translate', () => {
    renderWithMotion(<Toggle show />, 'standard');
    const region = screen.getByRole('region', { name: 'Near threshold' });
    expect(region).toHaveAttribute('data-motion-level', 'standard');
    expect(entersAnimated(region)).toBe(true);
  });

  it('off: renders static', () => {
    renderWithMotion(<Toggle show />, 'off');
    expect(isStatic(screen.getByRole('region', { name: 'Near threshold' }))).toBe(true);
  });

  it('standard: exits through AnimatePresence (still present, then gone)', async () => {
    const { rerender } = renderWithMotion(<Toggle show />, 'standard');
    rerender(<Toggle show={false} />);
    expect(screen.queryByRole('region', { name: 'Near threshold' })).not.toBeNull();
    await flushMotion(500);
    expect(screen.queryByRole('region', { name: 'Near threshold' })).toBeNull();
  });

  it('off: exit is immediate', async () => {
    const { rerender } = renderWithMotion(<Toggle show />, 'off');
    rerender(<Toggle show={false} />);
    await flushMotion();
    expect(screen.queryByRole('region', { name: 'Near threshold' })).toBeNull();
  });

  it('status tone change cross-fades the side bar color', () => {
    const { rerender, container } = renderWithMotion(
      <Panel title="Situation" tone="OK">
        x
      </Panel>,
      'standard',
    );
    rerender(
      <Panel title="Situation" tone="DOWN">
        x
      </Panel>,
    );
    expect(container.querySelector('[data-status="DOWN"]')).not.toBeNull();
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(<Toggle show />, 'expressive', 'en', { reducedMotion: true });
    const region = screen.getByRole('region', { name: 'Near threshold' });
    expect(region).toHaveAttribute('data-motion-level', 'off');
    expect(isStatic(region)).toBe(true);
  });
});
