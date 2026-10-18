import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  it('canvas com descrição acessível do valor e do limite', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<ThresholdChart series={[100, 349]} rule={{ field: 'QTD', operator: '<', limit: 200 }} status="DOWN" />);
    const canvas = screen.getByRole('img');
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas).toHaveAccessibleName('Últimos 60 min de QTD: atual 349, limite QTD < 200');
  });

  it('desenha linha, limite tracejado e ponto atual quando há contexto 2D', () => {
    const { ctx, calls } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    render(<ThresholdChart series={[100, 250, null, 349]} rule={{ field: 'QTD', operator: '<', limit: 200 }} status="DOWN" />);
    expect(calls).toContain('setLineDash(1)');
    expect(calls.some((c) => c.startsWith('arc('))).toBe(true);
    expect(calls.some((c) => c.startsWith('stroke('))).toBe(true);
    expect(calls.some((c) => c.startsWith('fillRect('))).toBe(true);
  });

  it('mostra as marcas do eixo em texto', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<ThresholdChart series={[1, 2]} status="OK" />);
    expect(screen.getByText('-60min')).toBeInTheDocument();
    expect(screen.getByText('agora')).toBeInTheDocument();
  });
});
