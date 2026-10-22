import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MonitorView } from '@/shared/api/types';
import { formatCardValue, orderMonitors, useCardInteractions, type CardActionHandlers } from './cards';
import type { CardAction } from './definitions/cards';

const m = (id: string, name: string, status: MonitorView['status'], since = '2026-10-22T10:00:00Z'): MonitorView => ({ id, name, status, since, groupId: 'g', type: 'HTTP', value: 1 });

describe('FE-55 card helpers', () => {
  it('formats values per the chosen format and keeps sensitive values masked', () => {
    expect(formatCardValue(1234.567, 'ms', 'en', 'auto')).toBe('1,234.6 ms');
    expect(formatCardValue(1234.567, 'ms', 'en', 'integer')).toBe('1,235 ms');
    expect(formatCardValue(1234.567, undefined, 'pt-BR', 'decimal')).toBe('1.234,57');
    expect(formatCardValue(1_250_000, undefined, 'en', 'compact')).toBe('1.3M');
    expect(formatCardValue(4111111111111111, undefined, 'en', 'integer')).not.toContain('4111111111111111');
    expect(formatCardValue(null, 'ms', 'en', 'integer')).toBe('no response');
  });

  it('orders monitors by the group order setting', () => {
    const list = [m('1', 'b', 'OK'), m('2', 'a', 'DOWN'), m('3', 'c', 'WARN')];
    expect(orderMonitors(list, 'exceptions-first').map((x) => x.id)).toEqual(['2', '3', '1']);
    expect(orderMonitors(list, 'severity').map((x) => x.id)).toEqual(['2', '3', '1']);
    expect(orderMonitors(list, 'name').map((x) => x.id)).toEqual(['2', '1', '3']);
    expect(orderMonitors(list, 'manual').map((x) => x.id)).toEqual(['1', '2', '3']);
  });
});

function Card({ click, doubleClick, longPress, handlers }: { click: CardAction; doubleClick: CardAction; longPress: CardAction; handlers: CardActionHandlers }) {
  const props = useCardInteractions({ clickAction: click, doubleClickAction: doubleClick, longPressAction: longPress }, handlers);
  return <div {...props}>card</div>;
}

describe('useCardInteractions', () => {
  afterEach(() => vi.useRealTimers());

  it('runs the configured action on click, double-click and Enter', () => {
    const handlers = { 'open-detail': vi.fn(), expand: vi.fn() };
    render(<Card click="open-detail" doubleClick="expand" longPress="none" handlers={handlers} />);
    const card = screen.getByRole('button', { name: 'card' });
    fireEvent.click(card);
    expect(handlers['open-detail']).toHaveBeenCalledTimes(1);
    fireEvent.doubleClick(card);
    expect(handlers.expand).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handlers['open-detail']).toHaveBeenCalledTimes(2);
  });

  it('runs the long-press action after half a second', () => {
    vi.useFakeTimers();
    const handlers = { acknowledge: vi.fn() };
    render(<Card click="none" doubleClick="none" longPress="acknowledge" handlers={handlers} />);
    const card = screen.getByRole('button', { name: 'card' });
    fireEvent.pointerDown(card);
    act(() => void vi.advanceTimersByTime(600));
    expect(handlers.acknowledge).toHaveBeenCalledTimes(1);
  });

  it('is not interactive when no configured action has a handler', () => {
    render(<Card click="acknowledge" doubleClick="none" longPress="none" handlers={{}} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
