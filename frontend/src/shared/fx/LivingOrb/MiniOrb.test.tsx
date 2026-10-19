import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MiniOrb } from './MiniOrb';

const groups = [
  { id: 'pay', name: 'Payments' },
  { id: 'core', name: 'Core Banking' },
];

describe('FE-59 MiniOrb', () => {
  it('shows the global state in the core and one ring per group, without satellites', () => {
    render(
      <MiniOrb
        groups={groups}
        uptime24h={99}
        monitors={[
          { id: 'a', name: 'A', groupId: 'pay', type: 'HTTP', status: 'DOWN', value: null, since: '2026-10-18T17:00:00Z' },
          { id: 'b', name: 'B', groupId: 'core', type: 'HTTP', status: 'OK', value: 1, since: '2026-10-18T17:00:00Z' },
        ]}
      />,
    );
    const svg = screen.getByTestId('mini-orb');
    expect(svg).toHaveAttribute('data-core', 'DOWN');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect([...svg.querySelectorAll('[data-ring]')].map((r) => r.getAttribute('data-status'))).toEqual(['DOWN', 'OK']);
    expect(svg.querySelector('[data-satellite]')).toBeNull();
  });
});
