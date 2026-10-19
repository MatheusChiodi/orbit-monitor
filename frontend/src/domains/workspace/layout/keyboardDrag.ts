import { msg, type Message } from '@/shared/i18n/message';
import { moveBlock, resizeBlock, type LayoutBlock } from './grid';

/** FE-12: keyboard drag and drop as a pure reducer (Space grab/drop, arrows move, Shift+arrows resize, Esc cancel). */
export interface DragState {
  layout: LayoutBlock[];
  grabbed: string | null;
  /** Layout before the grab, restored by Esc. */
  original: LayoutBlock[] | null;
  announcement: Message | null;
}

export interface DragKey {
  key: string;
  shiftKey?: boolean;
  blockId: string;
}

export function initialDragState(layout: readonly LayoutBlock[]): DragState {
  return { layout: [...layout], grabbed: null, original: null, announcement: null };
}

const DELTAS: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
};

export function keyboardDrag(state: DragState, input: DragKey): DragState {
  const block = state.layout.find((b) => b.id === input.blockId);
  if (!block) return { ...state, announcement: null };

  if (input.key === ' ') {
    if (state.grabbed === block.id) {
      return { ...state, grabbed: null, original: null, announcement: msg('layout.dnd.dropped', { name: block.id }) };
    }
    return {
      ...state,
      grabbed: block.id,
      original: state.layout,
      announcement: msg('layout.dnd.grabbed', { name: block.id, x: block.x + 1, y: block.y + 1 }),
    };
  }

  if (input.key === 'Escape') {
    if (!state.grabbed) return { ...state, announcement: null };
    return { layout: state.original ?? state.layout, grabbed: null, original: null, announcement: msg('layout.dnd.cancelled') };
  }

  const delta = DELTAS[input.key];
  if (!delta || state.grabbed !== block.id) return { ...state, announcement: null };

  if (input.shiftKey) {
    const layout = resizeBlock(state.layout, block.id, { w: block.w + delta.dx, h: block.h + delta.dy });
    const resized = layout.find((b) => b.id === block.id) ?? block;
    return { ...state, layout, announcement: msg('layout.dnd.resized', { name: block.id, w: resized.w, h: resized.h }) };
  }
  const layout = moveBlock(state.layout, block.id, { x: block.x + delta.dx, y: block.y + delta.dy });
  const moved = layout.find((b) => b.id === block.id) ?? block;
  return { ...state, layout, announcement: msg('layout.dnd.moved', { name: block.id, x: moved.x + 1, y: moved.y + 1 }) };
}
