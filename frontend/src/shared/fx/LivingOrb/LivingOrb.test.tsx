import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { domContains, makePan } from '@/test/sensitive';
import { FxProvider } from '../FxProvider';
import type { FxLevel } from '../fxLevel';
import { resetWebglProbe } from '../HeroOrb/HeroOrb';
import { LivingOrb } from './LivingOrb';
import type { OrbMonitor } from './orbModel';

vi.mock('./LivingOrbScene', () => ({
  LivingOrbScene: () => <canvas data-testid="living-orb-canvas" />,
}));

const groups = [
  { id: 'pay', name: 'Payments' },
  { id: 'core', name: 'Core Banking' },
];

const monitors: OrbMonitor[] = [
  {
    id: 'recon',
    name: 'Reconciliation queue',
    groupId: 'pay',
    type: 'SQL',
    status: 'OK',
    value: 190,
    unit: 'QTY',
    rule: { field: 'QTY', operator: '<', limit: 200 },
    since: '2026-10-18T17:00:00Z',
  },
  { id: 'ledger', name: 'Last ledger batch', groupId: 'core', type: 'SQL', status: 'WARN', value: 14, since: '2026-10-18T17:00:00Z' },
];

function renderOrb(level: FxLevel, { webgl = false, onOpen = vi.fn(), list = monitors } = {}) {
  resetWebglProbe();
  if (webgl) {
    vi.stubGlobal('WebGLRenderingContext', class {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext);
  }
  render(
    <FxProvider level={level} monitorFrames={false}>
      <LivingOrb monitors={list} groups={groups} uptime24h={99.9} interactive onOpen={onOpen} fallback={<span data-testid="flat" />} />
    </FxProvider>,
  );
  return onOpen;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetWebglProbe();
});

// Resolve the lazy chunk once up front, so no test depends on how fast a dynamic import is under load.
beforeAll(async () => {
  await import('./LivingOrbScene');
}, 30_000);

describe('FE-59 LivingOrb — levels', () => {
  it('off: the flat 2D symbol plus the text summary, no orb', () => {
    renderOrb('off', { webgl: true });
    expect(screen.getByTestId('living-orb')).toHaveAttribute('data-mode', '2d');
    expect(screen.getByTestId('flat')).toBeInTheDocument();
    expect(screen.getByText('2 monitors in 2 groups, 1 warning, 1 near threshold')).toBeInTheDocument();
    expect(screen.queryByTestId('living-orb-canvas')).toBeNull();
  });

  it('minimal: a static orb with state colors only (no 3D)', () => {
    renderOrb('minimal', { webgl: true });
    expect(screen.getByTestId('living-orb')).toHaveAttribute('data-mode', 'svg');
    expect(screen.getByTestId('orb-svg').querySelector('[data-satellite="ledger"]')).toHaveAttribute('data-status', 'WARN');
    expect(screen.queryByTestId('living-orb-canvas')).toBeNull();
  });

  it('standard with WebGL: the live 3D orb, described by the text summary', async () => {
    renderOrb('standard', { webgl: true });
    const canvas = await screen.findByTestId('living-orb-canvas');
    const group = screen.getByRole('group', { name: 'System orb' });
    expect(group).toHaveAccessibleDescription('2 monitors in 2 groups, 1 warning, 1 near threshold');
    expect(canvas.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(canvas.textContent).toBe('');
  });

  it('without WebGL: the static orb even at expressive', () => {
    renderOrb('expressive');
    expect(screen.getByTestId('living-orb')).toHaveAttribute('data-mode', 'svg');
  });
});

describe('FE-59 LivingOrb — interaction', () => {
  it('arrow keys move between satellites; the DOM tooltip shows name, state, value and rule', async () => {
    renderOrb('minimal');
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    const tip = screen.getByRole('tooltip');
    expect(within(tip).getByText('Reconciliation queue')).toBeInTheDocument();
    expect(tip).toHaveTextContent('OK');
    expect(tip).toHaveTextContent('190 QTY');
    expect(tip).toHaveTextContent('rule QTY < 200');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Last ledger batch');
  });

  it('Enter opens the focused monitor', async () => {
    const onOpen = renderOrb('minimal');
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(onOpen).toHaveBeenCalledWith('recon');
  });

  it('the legend explains the encoding', async () => {
    renderOrb('standard');
    await userEvent.click(screen.getByRole('button', { name: 'Legend' }));
    expect(screen.getByText('Rings: one per group, tinted by the group state')).toBeInTheDocument();
  });

  it('tooltip values go through SafeValue: a card number in a name is masked', async () => {
    const pan = makePan();
    renderOrb('minimal', { list: [{ ...monitors[0]!, name: pan }] });
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    expect(domContains(document.body, pan)).toBe(false);
  });
});
