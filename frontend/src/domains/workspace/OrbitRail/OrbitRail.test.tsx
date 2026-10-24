import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import type { MonitorView } from '@/shared/api/types';
import { AnimationLevelScope } from '@/shared/motion/animationLevel';
import { renderWithLocale } from '@/test/renderWithLocale';
import { OrbitRail } from './OrbitRail';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));
const self = { id: 'orbit_self', name: 'Orbit', groupId: '', type: 'SELF', status: 'DOWN', value: null, since: '' } as unknown as MonitorView;

describe('FE-68 OrbitRail', () => {
  it('draws one satellite per monitor and leaves out the self check', () => {
    render(<OrbitRail monitors={[self, ...snap.monitors]} groups={snap.groups} onOpen={vi.fn()} />);
    expect(screen.getAllByRole('link')).toHaveLength(snap.monitors.length);
    expect(screen.queryByRole('link', { name: /^Orbit,/ })).toBeNull();
  });

  it('summarizes the states in one line, without the self check', () => {
    render(<OrbitRail monitors={[self, ...snap.monitors]} groups={snap.groups} onOpen={vi.fn()} />);
    const down = snap.monitors.filter((m) => m.status === 'DOWN').length;
    expect(screen.getByText(new RegExp(`^${down} down`))).toBeInTheDocument();
  });

  it('Down satellites come first and are named with state and value', () => {
    render(<OrbitRail monitors={snap.monitors} groups={snap.groups} onOpen={vi.fn()} />);
    expect(screen.getAllByRole('link')[0]).toHaveAccessibleName(/Reconciliation queue, Down, 349 QTY/);
  });

  it('is one tab stop; arrows move between satellites and Enter opens the monitor', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<OrbitRail monitors={snap.monitors} groups={snap.groups} onOpen={onOpen} />);
    const links = screen.getAllByRole('link');
    expect(links.filter((l) => l.getAttribute('tabindex') === '0')).toHaveLength(1);
    await user.tab();
    expect(links[0]).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(links[1]).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledWith(links[1]!.getAttribute('data-monitor'));
  });

  it('hover or focus shows the name and value', () => {
    render(<OrbitRail monitors={snap.monitors} groups={snap.groups} onOpen={vi.fn()} />);
    fireEvent.mouseEnter(screen.getAllByRole('link')[0]!);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Reconciliation queue');
    expect(screen.getByRole('tooltip')).toHaveTextContent('349 QTY');
  });

  it('Down satellites pulse unless animation is off', () => {
    const { container, unmount } = render(<OrbitRail monitors={snap.monitors} groups={snap.groups} onOpen={vi.fn()} />);
    expect(container.querySelectorAll('[data-pulse]').length).toBeGreaterThan(0);
    unmount();
    const off = render(
      <AnimationLevelScope level="off">
        <OrbitRail monitors={snap.monitors} groups={snap.groups} onOpen={vi.fn()} />
      </AnimationLevelScope>,
    );
    expect(off.container.querySelectorAll('[data-pulse]')).toHaveLength(0);
  });

  it('an empty install shows the empty track and says so, in pt-BR too', () => {
    renderWithLocale(<OrbitRail monitors={[self]} groups={[]} onOpen={vi.fn()} />, 'pt-BR');
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.getByText('Nenhum monitor ainda')).toBeInTheDocument();
  });

  it('one monitor that has not run yet is "waiting", never "All 0 monitors OK"', () => {
    const fresh = { ...snap.monitors[0]!, status: 'UNKNOWN' } as unknown as MonitorView;
    render(<OrbitRail monitors={[self, fresh]} groups={snap.groups} onOpen={vi.fn()} />);
    expect(screen.getByText('1 waiting for first check')).toBeInTheDocument();
    expect(screen.queryByText(/All 0/)).toBeNull();
    expect(screen.getByRole('link')).toHaveAccessibleName(/Waiting for first check/);
  });
});
