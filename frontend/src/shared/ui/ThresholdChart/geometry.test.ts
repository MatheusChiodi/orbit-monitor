import { describe, expect, it } from 'vitest';
import { thresholdGeometry } from './geometry';

const box = { width: 590, height: 100, padding: { top: 0, right: 0, bottom: 0, left: 0 } };

describe('thresholdGeometry', () => {
  it('distribui os pontos na largura e inclui o limite na escala', () => {
    const g = thresholdGeometry([100, 150, 349], { limit: 200, operator: '<' }, { ...box, width: 200 });
    expect(g.points.map((p) => p?.x)).toEqual([0, 100, 200]);
    expect(g.max).toBeGreaterThanOrEqual(349);
    expect(g.min).toBeLessThanOrEqual(100);
    expect(g.limitY).toBeGreaterThan(0);
    expect(g.limitY).toBeLessThan(100);
  });

  it('marca violação conforme o operador', () => {
    const g = thresholdGeometry([100, 250, 349], { limit: 200, operator: '<' }, box);
    expect(g.points.map((p) => p?.violated)).toEqual([false, true, true]);
    const min = thresholdGeometry([100, 250], { limit: 200, operator: '>=' }, box);
    expect(min.points.map((p) => p?.violated)).toEqual([true, false]);
  });

  it('agrupa buracos consecutivos (sem resposta)', () => {
    const g = thresholdGeometry([1, null, null, 4, null, 6], { limit: 5, operator: '<' }, { ...box, width: 500 });
    expect(g.gaps).toEqual([
      { from: 1, to: 2 },
      { from: 4, to: 4 },
    ]);
    expect(g.points[1]).toBeNull();
  });

  it('último ponto válido é o atual', () => {
    const g = thresholdGeometry([1, 2, null], { limit: 5, operator: '<' }, box);
    expect(g.current?.value).toBe(2);
  });

  it('cinco marcas de eixo de -60min até agora', () => {
    const g = thresholdGeometry([1, 2], { limit: 5, operator: '<' }, box);
    expect(g.ticks.map((t) => t.label)).toEqual(['-60min', '-45min', '-30min', '-15min', 'agora']);
  });

  it('série vazia não quebra', () => {
    const g = thresholdGeometry([], { limit: 5, operator: '<' }, box);
    expect(g.points).toEqual([]);
    expect(g.current).toBeNull();
  });

  it('sem limite usa só os valores', () => {
    const g = thresholdGeometry([10, 20], null, box);
    expect(g.limitY).toBeNull();
    expect(g.points.every((p) => p && !p.violated)).toBe(true);
  });
});
