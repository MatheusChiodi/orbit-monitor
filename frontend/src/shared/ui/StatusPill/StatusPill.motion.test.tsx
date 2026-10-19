import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import { StatusDot, StatusPill } from './StatusPill';

describe('FE-51 StatusPill motion', () => {
  it('standard: the label cross-fades on a status change (old and new both present)', () => {
    const { rerender } = renderWithMotion(<StatusPill status="OK" />, 'standard');
    rerender(<StatusPill status="DOWN" />);
    expect(screen.queryByText('OK')).not.toBeNull();
    expect(screen.getByText('DOWN')).toBeInTheDocument();
  });

  it('off: only the new label after the change', async () => {
    const { rerender } = renderWithMotion(<StatusPill status="OK" />, 'off');
    rerender(<StatusPill status="WARN" />);
    await flushMotion();
    expect(screen.queryByText('OK')).toBeNull();
    expect(screen.getByText('WARNING')).toBeInTheDocument();
  });

  it('colors follow data-status', () => {
    const { rerender, container } = renderWithMotion(<StatusPill status="OK" />, 'standard');
    rerender(<StatusPill status="WARN" />);
    expect(container.querySelector('[data-status="WARN"]')).not.toBeNull();
  });

  it('prefers-reduced-motion forces off', () => {
    const { container } = renderWithMotion(<StatusPill status="OK" />, 'expressive', 'en', { reducedMotion: true });
    const root = container.querySelector('[data-motion-level]');
    expect(root).toHaveAttribute('data-motion-level', 'off');
    expect(isStatic(root as HTMLElement)).toBe(true);
  });
});

describe('FE-51 StatusDot motion', () => {
  it('standard and expressive: one soft pulse after a change', () => {
    for (const level of ['standard', 'expressive'] as const) {
      const { rerender, unmount } = renderWithMotion(<StatusDot status="OK" />, level);
      rerender(<StatusDot status="WARN" />);
      expect(screen.getByRole('img', { name: 'WARNING' })).toHaveAttribute('data-pulse', 'once');
      unmount();
    }
  });

  it('minimal and off: no pulse', () => {
    for (const level of ['minimal', 'off'] as const) {
      const { rerender, unmount } = renderWithMotion(<StatusDot status="OK" />, level);
      rerender(<StatusDot status="WARN" />);
      expect(screen.getByRole('img', { name: 'WARNING' })).not.toHaveAttribute('data-pulse');
      unmount();
    }
  });

  it('no pulse on first render', () => {
    renderWithMotion(<StatusDot status="DOWN" />, 'standard');
    expect(screen.getByRole('img', { name: 'DOWN' })).not.toHaveAttribute('data-pulse');
  });

  it('the owner-less DOWN blink stays even when off', () => {
    renderWithMotion(<StatusDot status="DOWN" blink />, 'off');
    expect(screen.getByRole('img', { name: 'DOWN' }).className).toContain('anim-blink');
  });
});
