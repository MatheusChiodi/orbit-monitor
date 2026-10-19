import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nearLimit, type NearLimitItem } from '@/domains/monitor/status';
import { entersAnimated, flushMotion, isStatic, renderWithMotion } from '@/test/motion';
import { mockSnapshot } from '../../mock';
import { NearLimit } from './NearLimit';

const now = new Date(2026, 9, 18, 17, 10, 0);
const items = nearLimit(mockSnapshot('incident', now).monitors);

function row(name: string) {
  return screen.getByText(name).closest('li') as HTMLElement;
}

afterEach(() => vi.useRealTimers());

describe('FE-51 NearLimit motion', () => {
  it('standard: rows are reorderable and enter animated', () => {
    renderWithMotion(<NearLimit items={items} />, 'standard');
    const li = row('USERS tablespace');
    expect(li).toHaveAttribute('data-motion', 'reorder');
    expect(li).toHaveAttribute('data-motion-level', 'standard');
    expect(entersAnimated(li)).toBe(true);
  });

  it('off: static', () => {
    renderWithMotion(<NearLimit items={items} />, 'off');
    expect(isStatic(row('USERS tablespace'))).toBe(true);
  });

  it('headroom change: the percentage swaps in place and flashes the direction', () => {
    vi.useFakeTimers();
    const first = items[0]!;
    const tighter: NearLimitItem[] = [{ ...first, headroom: 0.02 }, ...items.slice(1)];
    const { rerender } = renderWithMotion(<NearLimit items={items} />, 'standard');
    rerender(<NearLimit items={tighter} />);
    expect(screen.getByText('2%')).toHaveAttribute('data-flash', 'down');
  });

  it('off: no flash', () => {
    vi.useFakeTimers();
    const first = items[0]!;
    const { rerender } = renderWithMotion(<NearLimit items={items} />, 'off');
    rerender(<NearLimit items={[{ ...first, headroom: 0.02 }, ...items.slice(1)]} />);
    expect(screen.getByText('2%')).not.toHaveAttribute('data-flash');
  });

  it('a row that leaves the top five exits through AnimatePresence', async () => {
    const { rerender } = renderWithMotion(<NearLimit items={items} />, 'standard');
    rerender(<NearLimit items={items.slice(0, 4)} />);
    expect(screen.queryByText(items[4]!.monitor.name)).not.toBeNull();
    await flushMotion(500);
    expect(screen.queryByText(items[4]!.monitor.name)).toBeNull();
  });

  it('prefers-reduced-motion forces off', () => {
    renderWithMotion(<NearLimit items={items} />, 'expressive', 'en', { reducedMotion: true });
    expect(row('USERS tablespace')).toHaveAttribute('data-motion-level', 'off');
  });
});
