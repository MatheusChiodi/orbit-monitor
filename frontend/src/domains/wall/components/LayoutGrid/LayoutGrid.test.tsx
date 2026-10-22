import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LayoutBlock } from '@/domains/workspace/layout/grid';
import { renderWithLocale } from '@/test/renderWithLocale';
import { mockSnapshot } from '../../mock';
import { pickHero } from '../../selectors';
import { LayoutGrid, type LayoutGridProps } from './LayoutGrid';

const now = new Date(2026, 9, 18, 17, 10, 0);
const snapshot = mockSnapshot('incident', now);
const block = (kind: LayoutBlock['kind'], extra: Partial<LayoutBlock> = {}): LayoutBlock => ({ id: kind, kind, x: 0, y: 0, w: 6, h: 2, ...extra });

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

function setup(blocks: LayoutBlock[], props: Partial<LayoutGridProps> = {}) {
  return render(
    <LayoutGrid blocks={blocks} snapshot={snapshot} hero={pickHero(snapshot)} now={now} freshEventIds={new Set()} onAcknowledge={vi.fn()} {...props} />,
  );
}

describe('FE-11 wall rendering of a saved layout', () => {
  it('places each block on the 12-column grid in reading order', () => {
    const { container } = setup([block('timeline', { x: 6, y: 0 }), block('uptime', { x: 0, y: 2, w: 12 }), block('hero', { x: 0, y: 0 })]);
    const cells = [...container.querySelectorAll<HTMLElement>('[data-block]')];
    expect(cells.map((c) => c.dataset.block)).toEqual(['hero', 'timeline', 'uptime']);
    expect(cells[1]?.style.getPropertyValue('--block-col')).toBe('7 / span 6');
    expect(cells[2]?.style.getPropertyValue('--block-row')).toBe('3 / span 2');
    expect(container.querySelector('main')?.style.getPropertyValue('--wall-rows')).toBe('4');
  });

  it('renders only the blocks of the layout (no matrix when the layout has none)', () => {
    setup([block('hero'), block('uptime')]);
    expect(screen.getByRole('region', { name: 'Situation' })).toBeInTheDocument();
    expect(screen.getByText('24 h availability')).toBeInTheDocument();
    expect(screen.getByText(`${snapshot.uptime24h.toFixed(2)}%`)).toBeInTheDocument();
    expect(screen.queryByText('All monitors')).not.toBeInTheDocument();
  });

  it('value, series, indicators and table blocks follow their source monitor or group', () => {
    const monitor = snapshot.monitors[0]!;
    setup([
      block('value', { source: monitor.id }),
      block('series', { source: monitor.id }),
      block('indicators', { source: monitor.groupId }),
      block('live-table', { source: monitor.groupId }),
    ]);
    expect(screen.getAllByText(monitor.name).length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: `${monitor.name}: Last 60 minutes` })).toBeInTheDocument();
    const table = screen.getByRole('table');
    const groupSize = snapshot.monitors.filter((m) => m.groupId === monitor.groupId).length;
    expect(within(table).getAllByRole('row')).toHaveLength(groupSize + 1);
  });

  it('a series block with a range loads that history and states its coverage (FE-58)', async () => {
    const monitor = snapshot.monitors[0]!;
    const loadHistory = vi.fn(async () => ({
      monitorId: monitor.id,
      from: '',
      to: '',
      resolution: '1h' as const,
      coverage: { oldest: new Date(now.getTime() - 3 * 86_400_000).toISOString(), newest: now.toISOString(), retentionDays: 30, rawWritesEnabled: true },
      samples: null,
      buckets: [{ start: '', count: 1, ok: 1, warn: 0, down: 0, unknown: 0, latencyMin: null, latencyMax: null, latencyMean: null, latencyP95: null, valueMin: 1, valueMax: 1, valueMean: 1 }],
    }));
    setup([block('series', { source: monitor.id, range: '7d' })], { loadHistory });
    expect(screen.getByText(`${monitor.name}: Last 7 days`)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('note')).toHaveTextContent('History available: last 30 days'));
    expect(loadHistory).toHaveBeenCalledWith(monitor.id, expect.objectContaining({ from: expect.any(Date) }), '1m');
  });

  it('the clock block shows who is on call (BE-33)', () => {
    setup([block('clock')], { onCall: [{ scheduleId: 's', scheduleName: 'Payments', person: 'Ana Souza', shiftEndsAt: '2026-10-18T21:00:00' }] });
    const onCall = screen.getByRole('region', { name: 'On call' });
    expect(within(onCall).getByText('Ana Souza')).toBeInTheDocument();
    expect(within(onCall).getByText('until 21:00')).toBeInTheDocument();
    expect(screen.getByText('17:10:00')).toBeInTheDocument();
  });

  it('text blocks never render HTML and redact sensitive values', () => {
    setup([block('text', { text: '<b>Call 4111 1111 1111 1111</b>' })]);
    expect(document.querySelector('b')).toBeNull();
    expect(screen.queryByText(/4111 1111 1111 1111/)).not.toBeInTheDocument();
  });

  it('ranking reuses the near-threshold list with its own title, in pt-BR too', () => {
    renderWithLocale(
      <LayoutGrid blocks={[block('ranking')]} snapshot={snapshot} hero={null} now={now} freshEventIds={new Set()} onAcknowledge={vi.fn()} />,
      'pt-BR',
    );
    expect(screen.getByText('Mais perto do limite')).toBeInTheDocument();
  });
});
