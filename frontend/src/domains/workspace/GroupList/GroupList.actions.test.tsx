import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import { CustomizationProvider } from '@/shared/customization/CustomizationProvider';
import { createCustomizationStore, type CustomizationState } from '@/shared/customization/store';
import { GroupList } from './GroupList';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));

function wrapperWith(state: Partial<CustomizationState>) {
  const store = createCustomizationStore({ storage: false });
  store.setState(state);
  return ({ children }: { children: ReactNode }) => <CustomizationProvider store={store}>{children}</CustomizationProvider>;
}

beforeEach(() => localStorage.clear());

describe('FE-55 card actions wired by the console', () => {
  it('"acknowledge" and "open-target" call their handlers with the monitor id', async () => {
    const user = userEvent.setup();
    const onAcknowledgeMonitor = vi.fn();
    const onOpenTarget = vi.fn();
    const wrapper = wrapperWith({ workspace: { 'card.monitor.clickAction': 'acknowledge', 'card.monitor.doubleClickAction': 'open-target' } });
    render(
      <GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} onAcknowledgeMonitor={onAcknowledgeMonitor} onOpenTarget={onOpenTarget} />,
      { wrapper },
    );
    const row = within(screen.getByRole('region', { name: 'Payments' })).getAllByRole('button', { name: /Reconciliation queue/ })[0]!;
    await user.click(row);
    expect(onAcknowledgeMonitor).toHaveBeenCalledWith('reconciliation');
    await user.dblClick(row);
    expect(onOpenTarget).toHaveBeenCalledWith('reconciliation');
  });
});
