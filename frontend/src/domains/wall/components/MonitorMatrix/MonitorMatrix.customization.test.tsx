import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CustomizationProvider } from '@/shared/customization/CustomizationProvider';
import { createCustomizationStore, type CustomizationState } from '@/shared/customization/store';
import { mockSnapshot } from '../../mock';
import { groupRows } from '../../selectors';
import { MonitorMatrix } from './MonitorMatrix';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));

function wrapperWith(state: Partial<CustomizationState>, layoutId: string | null = null) {
  const store = createCustomizationStore({ storage: false });
  store.setState(state);
  return ({ children }: { children: ReactNode }) => (
    <CustomizationProvider store={store} layoutId={layoutId}>
      {children}
    </CustomizationProvider>
  );
}

describe('FE-55 MonitorMatrix reads card settings from the registry', () => {
  it('applies the layout variant, hides the value and uses the instance title', () => {
    const wrapper = wrapperWith(
      {
        layouts: { noc: { 'card.monitor.variant': 'detailed', 'card.monitor.fields': ['status', 'name'] } },
        instances: { 'card.monitor:reconciliation': { 'card.monitor.title': 'Recon backlog', 'card.monitor.icon': 'queue' } },
      },
      'noc',
    );
    render(<MonitorMatrix rows={groupRows(snap)} unownedMonitorIds={new Set()} />, { wrapper });
    const cell = within(screen.getByRole('group', { name: 'Payments' })).getAllByRole('listitem')[0]!;
    expect(cell).toHaveAttribute('data-variant', 'detailed');
    expect(cell).toHaveTextContent('Recon backlog');
    expect(cell).not.toHaveTextContent('349 QTY');
    expect(cell).toHaveTextContent('DOWN');
    expect(cell.querySelector('[data-icon="queue"]')).not.toBeNull();
  });

  it('turns off the state tint but keeps the state as text', () => {
    const wrapper = wrapperWith({ workspace: { 'card.monitor.colorBands': false } });
    render(<MonitorMatrix rows={groupRows(snap)} unownedMonitorIds={new Set()} />, { wrapper });
    const cell = within(screen.getByRole('group', { name: 'Payments' })).getAllByRole('listitem')[0]!;
    expect(cell.className).toContain('bg-s2');
    expect(cell).toHaveAttribute('data-status', 'DOWN');
    expect(cell).toHaveTextContent('DOWN');
  });

  it('reports the configured click action to the host', () => {
    const onMonitorAction = vi.fn();
    const wrapper = wrapperWith({ workspace: { 'card.monitor.clickAction': 'acknowledge' } });
    render(<MonitorMatrix rows={groupRows(snap)} unownedMonitorIds={new Set()} onMonitorAction={onMonitorAction} />, { wrapper });
    fireEvent.click(screen.getAllByRole('button', { name: /Reconciliation queue/ })[0]!);
    expect(onMonitorAction).toHaveBeenCalledWith('acknowledge', 'reconciliation');
  });
});
