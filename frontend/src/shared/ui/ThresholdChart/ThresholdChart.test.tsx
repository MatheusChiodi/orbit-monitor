import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { ThresholdChart } from './ThresholdChart';

function fakeContext() {
  const calls: string[] = [];
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      return (...args: unknown[]) => {
        calls.push(`${prop}(${args.length})`);
      };
    },
    set(target, prop: string, value) {
      target[prop] = value;
      return true;
    },
  };
  return { ctx: new Proxy<Record<string, unknown>>({}, handler), calls };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ThresholdChart', () => {
  it('canvas with an accessible description of the value and the limit', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<ThresholdChart series={[100, 349]} rule={{ field: 'QTY', operator: '<', limit: 200 }} status="DOWN" />);
    const canvas = screen.getByRole('img');
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas).toHaveAccessibleName('Last 60 min of QTY: current 349, limit QTY < 200');
  });

  it('the accessible description is translated to pt-BR', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    renderWithLocale(<ThresholdChart series={[1.5, null]} rule={{ field: 'PCT', operator: '<', limit: 2.5 }} status="OK" />, 'pt-BR');
    expect(screen.getByRole('img')).toHaveAccessibleName('Últimos 60 min de PCT: atual 1,5, limite PCT < 2,5');
    expect(screen.getByText('agora')).toBeInTheDocument();
  });

  it('draws the line, dashed limit and current point when a 2D context exists', () => {
    const { ctx, calls } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    render(<ThresholdChart series={[100, 250, null, 349]} rule={{ field: 'QTY', operator: '<', limit: 200 }} status="DOWN" />);
    expect(calls).toContain('setLineDash(1)');
    expect(calls.some((c) => c.startsWith('arc('))).toBe(true);
    expect(calls.some((c) => c.startsWith('stroke('))).toBe(true);
    expect(calls.some((c) => c.startsWith('fillRect('))).toBe(true);
  });

  it('shows the axis ticks as text', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<ThresholdChart series={[1, 2]} status="OK" />);
    expect(screen.getByText('-60min')).toBeInTheDocument();
    expect(screen.getByText('now')).toBeInTheDocument();
  });
});
