import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '@/shared/api/types';
import { entersAnimated, flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import { mockSnapshot } from '../../mock';
import { Timeline } from './Timeline';

const now = new Date(2026, 9, 18, 17, 10, 0);
const events = mockSnapshot('incident', now).timeline;
const fresh: TimelineEvent = { id: 'ev-new', at: now.toISOString(), kind: 'INFO', title: 'Deploy finished', detail: '' };

function item(title: string) {
  return screen.getByText(title).closest('li') as HTMLElement;
}

describe('FE-51 Timeline motion', () => {
  it('standard: a new event enters at the top animated', () => {
    const { rerender } = renderWithMotion(<Timeline events={events} freshIds={new Set()} />, 'standard');
    rerender(<Timeline events={[fresh, ...events]} freshIds={new Set(['ev-new'])} />);
    const li = item('Deploy finished');
    expect(li).toHaveAttribute('data-motion', 'reorder');
    expect(li).toHaveAttribute('data-motion-level', 'standard');
    expect(entersAnimated(li)).toBe(true);
  });

  it('off: new events appear static and without the flash class', () => {
    const { rerender } = renderWithMotion(<Timeline events={events} freshIds={new Set()} />, 'off');
    rerender(<Timeline events={[fresh, ...events]} freshIds={new Set(['ev-new'])} />);
    expect(isStatic(item('Deploy finished'))).toBe(true);
    expect(item('Deploy finished').className).not.toContain('anim-flash');
  });

  it('standard: an event trimmed from the list leaves through AnimatePresence', async () => {
    const { rerender } = renderWithMotion(<Timeline events={events} freshIds={new Set()} />, 'standard');
    rerender(<Timeline events={events.slice(0, -1)} freshIds={new Set()} />);
    expect(screen.queryByText('Invoice issuing recovered')).not.toBeNull();
    await flushMotion(500);
    expect(screen.queryByText('Invoice issuing recovered')).toBeNull();
  });

  it('off: removal is immediate', async () => {
    const { rerender } = renderWithMotion(<Timeline events={events} freshIds={new Set()} />, 'off');
    rerender(<Timeline events={events.slice(0, -1)} freshIds={new Set()} />);
    await flushMotion();
    expect(screen.queryByText('Invoice issuing recovered')).toBeNull();
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(<Timeline events={events} freshIds={new Set()} />, 'expressive', 'en', { reducedMotion: true });
    expect(item('Reconciliation queue down')).toHaveAttribute('data-motion-level', 'off');
    expect(isStatic(item('Reconciliation queue down'))).toBe(true);
  });
});
