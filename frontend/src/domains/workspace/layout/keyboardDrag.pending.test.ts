import { describe, expect, it } from 'vitest';
import type { LayoutBlock } from './grid';
import { initialDragState, keyboardDrag } from './keyboardDrag';

const layout: LayoutBlock[] = [
  { id: 'hero', kind: 'hero', x: 0, y: 0, w: 7, h: 4 },
  { id: 'timeline', kind: 'timeline', x: 7, y: 0, w: 5, h: 4 },
];

describe('FE-12 keyboard drag and drop (pure reducer)', () => {
  it('Space grabs the focused block and announces it', () => {
    const next = keyboardDrag(initialDragState(layout), { key: ' ', blockId: 'hero' });
    expect(next.grabbed).toBe('hero');
    expect(next.announcement).toEqual({ key: 'layout.dnd.grabbed', params: { name: 'hero', x: 1, y: 1 } });
  });

  it('arrows move the grabbed block one cell and announce the new position', () => {
    let state = keyboardDrag(initialDragState(layout), { key: ' ', blockId: 'timeline' });
    state = keyboardDrag(state, { key: 'ArrowDown', blockId: 'timeline' });
    expect(state.layout.find((b) => b.id === 'timeline')).toMatchObject({ x: 7, y: 1 });
    expect(state.announcement).toEqual({ key: 'layout.dnd.moved', params: { name: 'timeline', x: 8, y: 2 } });
  });

  it('Shift + arrows resize instead of moving', () => {
    let state = keyboardDrag(initialDragState(layout), { key: ' ', blockId: 'hero' });
    state = keyboardDrag(state, { key: 'ArrowRight', shiftKey: true, blockId: 'hero' });
    expect(state.layout.find((b) => b.id === 'hero')).toMatchObject({ x: 0, w: 8 });
    expect(state.announcement?.key).toBe('layout.dnd.resized');
  });

  it('Space again drops and keeps the new position', () => {
    let state = keyboardDrag(initialDragState(layout), { key: ' ', blockId: 'hero' });
    state = keyboardDrag(state, { key: 'ArrowDown', blockId: 'hero' });
    state = keyboardDrag(state, { key: ' ', blockId: 'hero' });
    expect(state.grabbed).toBeNull();
    expect(state.layout.find((b) => b.id === 'hero')?.y).toBe(1);
    expect(state.announcement?.key).toBe('layout.dnd.dropped');
  });

  it('Esc cancels and restores the original layout', () => {
    let state = keyboardDrag(initialDragState(layout), { key: ' ', blockId: 'hero' });
    state = keyboardDrag(state, { key: 'ArrowDown', blockId: 'hero' });
    state = keyboardDrag(state, { key: 'Escape', blockId: 'hero' });
    expect(state.grabbed).toBeNull();
    expect(state.layout).toEqual(layout);
    expect(state.announcement?.key).toBe('layout.dnd.cancelled');
  });

  it('arrows without a grabbed block do nothing', () => {
    const state = keyboardDrag(initialDragState(layout), { key: 'ArrowDown', blockId: 'hero' });
    expect(state.layout).toEqual(layout);
    expect(state.announcement).toBeNull();
  });

  it('never moves outside the grid', () => {
    let state = keyboardDrag(initialDragState(layout), { key: ' ', blockId: 'hero' });
    state = keyboardDrag(state, { key: 'ArrowLeft', blockId: 'hero' });
    state = keyboardDrag(state, { key: 'ArrowUp', blockId: 'hero' });
    expect(state.layout.find((b) => b.id === 'hero')).toMatchObject({ x: 0, y: 0 });
  });
});
