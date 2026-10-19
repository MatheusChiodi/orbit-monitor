import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Incident } from '@/shared/api/types';
import { entersAnimated, flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import { AcknowledgeButton } from './AcknowledgeButton';

const base: Incident = {
  id: 'i1',
  monitorId: 'm1',
  severity: 'DOWN',
  openedAt: '2026-10-18T17:00:00.000Z',
  acknowledgedBy: null,
  acknowledgedAt: null,
  impact: [],
  escalatesAt: null,
};
const acked: Incident = { ...base, acknowledgedBy: 'M. Chiodi', acknowledgedAt: new Date(2026, 9, 18, 17, 4).toISOString() };

describe('FE-51 AcknowledgeButton motion', () => {
  it('standard: the button cross-fades into the acknowledged text', async () => {
    const { rerender } = renderWithMotion(<AcknowledgeButton incident={base} onAcknowledge={vi.fn()} />, 'standard');
    rerender(<AcknowledgeButton incident={acked} onAcknowledge={vi.fn()} />);
    const text = screen.getByText('M. Chiodi acknowledged at 17:04');
    expect(entersAnimated(text)).toBe(true);
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeNull();
    await flushMotion(500);
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull();
  });

  it('off: swaps immediately', async () => {
    const { rerender } = renderWithMotion(<AcknowledgeButton incident={base} onAcknowledge={vi.fn()} />, 'off');
    rerender(<AcknowledgeButton incident={acked} onAcknowledge={vi.fn()} />);
    await flushMotion();
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull();
    expect(isStatic(screen.getByText('M. Chiodi acknowledged at 17:04'))).toBe(true);
  });

  it('the button exposes the press preset', () => {
    renderWithMotion(<AcknowledgeButton incident={base} onAcknowledge={vi.fn()} />, 'standard');
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toHaveAttribute('data-motion', 'press');
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(<AcknowledgeButton incident={base} onAcknowledge={vi.fn()} />, 'expressive', 'en', {
      reducedMotion: true,
    });
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toHaveAttribute('data-motion-level', 'off');
  });
});
