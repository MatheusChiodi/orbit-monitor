import { describe, expect, it } from 'vitest';
import { BUILT_IN_BLOCKS, isClassicArrangement, orderedBlocks } from './wallLayout';

describe('FE-11 wall layout arrangement', () => {
  it('the built-in NOC layout (BE-41 prototype) keeps the tuned classic wall', () => {
    expect(isClassicArrangement(BUILT_IN_BLOCKS)).toBe(true);
    expect(isClassicArrangement(BUILT_IN_BLOCKS.map((b) => ({ ...b, id: `${b.kind}-x` })))).toBe(true);
  });

  it('any other arrangement renders the 12-column grid', () => {
    expect(isClassicArrangement(BUILT_IN_BLOCKS.slice(1))).toBe(false);
    expect(isClassicArrangement([...BUILT_IN_BLOCKS, { id: 'clock', kind: 'clock', x: 0, y: 10, w: 3, h: 2 }])).toBe(false);
    expect(isClassicArrangement(BUILT_IN_BLOCKS.map((b) => (b.kind === 'hero' ? { ...b, w: 6 } : b)))).toBe(false);
  });

  it('orders blocks top to bottom, left to right (phone and screen reader order)', () => {
    const blocks = orderedBlocks([
      { id: 'b', kind: 'timeline', x: 6, y: 0, w: 6, h: 2 },
      { id: 'c', kind: 'matrix', x: 0, y: 2, w: 12, h: 2 },
      { id: 'a', kind: 'hero', x: 0, y: 0, w: 6, h: 2 },
    ]);
    expect(blocks.map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });
});
