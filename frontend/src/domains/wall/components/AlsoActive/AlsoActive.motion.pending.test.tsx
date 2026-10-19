import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MonitorView } from '@/shared/api/types';
import { entersAnimated, flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import { mockSnapshot } from '../../mock';
import { alsoActive } from '../../selectors';
import { AlsoActive } from './AlsoActive';

const now = new Date(2026, 9, 18, 17, 10, 0);
const snap = mockSnapshot('incident', now);
const list = alsoActive(snap, 'reconciliation');

function item(name: string) {
  return screen.getByText(name).closest('li') as HTMLElement;
}

function view(monitors: MonitorView[]) {
  return <AlsoActive monitors={monitors} groups={snap.groups} now={now} />;
}

afterEach(() => vi.useRealTimers());

describe('FE-51 AlsoActive motion', () => {
  it('standard: items are list items that enter animated', () => {
    renderWithMotion(view(list), 'standard');
    const li = item('USERS tablespace');
    expect(li).toHaveAttribute('data-motion', 'listItem');
    expect(li).toHaveAttribute('data-motion-level', 'standard');
    expect(entersAnimated(li)).toBe(true);
  });

  it('off: static', () => {
    renderWithMotion(view(list), 'off');
    expect(isStatic(item('USERS tablespace'))).toBe(true);
  });

  it('a recovered monitor leaves through AnimatePresence (standard) or immediately (off)', async () => {
    const std = renderWithMotion(view(list), 'standard');
    std.rerender(view(list.slice(0, 1)));
    expect(screen.queryByText(list[1]!.name)).not.toBeNull();
    await flushMotion(500);
    expect(screen.queryByText(list[1]!.name)).toBeNull();
    std.unmount();
    const off = renderWithMotion(view(list), 'off');
    off.rerender(view(list.slice(0, 1)));
    await flushMotion();
    expect(screen.queryByText(list[1]!.name)).toBeNull();
  });

  it('value change flashes; never in off', () => {
    vi.useFakeTimers();
    const tablespace = list.find((m) => m.id === 'tablespace')!;
    const bumped = list.map((m) => (m.id === 'tablespace' ? { ...m, value: 84 } : m));
    const std = renderWithMotion(view(list), 'standard');
    std.rerender(view(bumped));
    expect(screen.getByText('84%')).toHaveAttribute('data-flash', 'up');
    std.unmount();
    const off = renderWithMotion(view(list), 'off');
    off.rerender(view(bumped));
    expect(screen.getByText('84%')).not.toHaveAttribute('data-flash');
    expect(tablespace.value).toBe(81);
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(view(list), 'expressive', 'en', { reducedMotion: true });
    expect(item('USERS tablespace')).toHaveAttribute('data-motion-level', 'off');
  });
});
