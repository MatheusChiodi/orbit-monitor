import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { domContains, groupedPan, makePan } from '@/test/sensitive';
import { mockSnapshot } from '../../mock';
import { pickHero } from '../../selectors';
import { Hero } from './Hero';

const now = new Date(2026, 9, 18, 17, 10, 0);
const pan = makePan();

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

describe('CORE-16 Hero privacy', () => {
  it('a PAN injected into name, group, impact and value never reaches the DOM', () => {
    const hero = pickHero(mockSnapshot('incident', now))!;
    hero.monitor = { ...hero.monitor, name: `Card ${groupedPan(pan)} queue`, value: Number(pan) };
    hero.group = { id: 'g', name: `Group ${pan}` };
    hero.incident = { ...hero.incident!, impact: [`card ${pan}`] };
    const { container } = render(<Hero selection={hero} now={now} onAcknowledge={vi.fn()} />);
    expect(domContains(container, pan)).toBe(false);
    expect(container.textContent).toContain(`•••• •••• •••• ${pan.slice(-4)}`);
  });

  it('the chart description never carries the raw value', () => {
    const hero = pickHero(mockSnapshot('incident', now))!;
    hero.monitor = { ...hero.monitor, series: [Number(pan)] };
    const { container } = render(<Hero selection={hero} now={now} onAcknowledge={vi.fn()} />);
    expect(domContains(container, pan)).toBe(false);
  });
});
