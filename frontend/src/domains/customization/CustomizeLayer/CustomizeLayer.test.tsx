import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockSnapshot } from '@/domains/wall/mock';
import { GroupList } from '@/domains/workspace/GroupList';
import { fromEntries, type CustomizationApi } from '@/shared/customization/api';
import { CustomizationProvider } from '@/shared/customization/CustomizationProvider';
import { createCustomizeModeStore } from '@/shared/customization/customizeMode';
import { createCustomizationStore } from '@/shared/customization/store';
import { createTerminologyStore } from '@/shared/customization/terminology';
import { CustomizeToggle } from '../CustomizeToggle';
import { CustomizeLayer } from './CustomizeLayer';

const snap = mockSnapshot('incident', new Date(2026, 9, 18, 17, 10, 0));

function fakeApi(): CustomizationApi {
  return {
    load: vi.fn(async () => fromEntries([])),
    saveScope: vi.fn(async () => undefined),
    deleteEntry: vi.fn(async () => undefined),
    saveProfile: vi.fn(async () => undefined),
    loadTerminology: vi.fn(async () => ({ en: {}, 'pt-BR': {} })),
    saveTerminology: vi.fn(async () => undefined),
  };
}

function setup() {
  const api = fakeApi();
  const store = createCustomizationStore({ api });
  const mode = createCustomizeModeStore(store);
  const terminology = createTerminologyStore(api);
  render(
    <CustomizationProvider store={store} mode={mode} terminology={terminology}>
      <CustomizeToggle />
      <GroupList groups={snap.groups} monitors={snap.monitors} onNewMonitor={vi.fn()} />
      <CustomizeLayer />
    </CustomizationProvider>,
  );
  return { api, store, mode };
}

beforeEach(() => localStorage.clear());
afterEach(() => delete document.documentElement.dataset.customize);

describe('FE-53 Customize mode', () => {
  it('Ctrl+. turns every customizable item into a target with a handle', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.queryByRole('button', { name: 'Customize Reconciliation queue' })).not.toBeInTheDocument();
    await user.keyboard('{Control>}.{/Control}');
    expect(screen.getByRole('button', { name: 'Customize' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.customize).toBe('on');
    expect(screen.getByRole('button', { name: 'Customize Reconciliation queue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Customize Payments' })).toBeInTheDocument();
  });

  it('Ctrl+. works without the header toggle (the toggle now lives in Settings › Advanced)', async () => {
    const store = createCustomizationStore({ api: fakeApi() });
    const mode = createCustomizeModeStore(store);
    render(
      <CustomizationProvider store={store} mode={mode}>
        <CustomizeLayer />
      </CustomizationProvider>,
    );
    await userEvent.keyboard('{Control>}.{/Control}');
    expect(mode.getState().enabled).toBe(true);
    expect(screen.getByRole('region', { name: 'Customize' })).toBeInTheDocument();
  });

  it('reserves room at the bottom of the page so the bar never covers content', async () => {
    const { mode } = setup();
    mode.getState().toggle(true);
    expect(await screen.findByRole('region', { name: 'Customize' })).toBeInTheDocument();
    expect(document.body.style.paddingBottom).not.toBe('');
    mode.getState().toggle(false);
    await vi.waitFor(() => expect(document.body.style.paddingBottom).toBe(''));
  });

  it('opens an inspector with tabs, previews a change live and saves it to the chosen scope', async () => {
    const user = userEvent.setup();
    const { api } = setup();
    await user.click(screen.getByRole('button', { name: 'Customize' }));
    await user.click(screen.getByRole('button', { name: 'Customize Reconciliation queue' }));
    const inspector = screen.getByRole('dialog', { name: 'Customize Reconciliation queue' });
    expect(within(inspector).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Content', 'Appearance', 'Behavior', 'Names']);
    const title = within(inspector).getByRole('textbox', { name: 'Title' });
    await user.type(title, 'Recon backlog');
    await user.tab();
    expect(screen.getAllByText('Recon backlog').length).toBeGreaterThan(0);
    expect(screen.getByText('1 unsaved change')).toBeInTheDocument();
    expect(api.saveScope).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(api.saveScope).toHaveBeenCalledWith('instance', 'card.monitor:reconciliation', { 'card.monitor.title': 'Recon backlog' });
  });

  it('applies to all items of the type, undoes with Ctrl+Z and discards', async () => {
    const user = userEvent.setup();
    const { store } = setup();
    await user.click(screen.getByRole('button', { name: 'Customize' }));
    await user.click(screen.getByRole('button', { name: 'Customize Reconciliation queue' }));
    const inspector = screen.getByRole('dialog');
    await user.click(within(inspector).getByRole('tab', { name: 'Appearance' }));
    await user.click(within(inspector).getByRole('radio', { name: 'All items of this type' }));
    await user.selectOptions(within(inspector).getByRole('combobox', { name: 'Card size' }), 'compact');
    expect(store.getState().resolve('card.monitor.variant', { instanceId: 'card.monitor:checkout' }).value).toBe('compact');
    await user.selectOptions(within(inspector).getByRole('combobox', { name: 'Card size' }), 'detailed');
    await user.keyboard('{Control>}z{/Control}');
    expect(store.getState().resolve('card.monitor.variant').value).toBe('compact');
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(store.getState().resolve('card.monitor.variant').value).toBe('regular');
  });

  it('offers only the scopes a setting supports', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Customize' }));
    await user.click(screen.getByRole('button', { name: 'Customize Reconciliation queue' }));
    const inspector = screen.getByRole('dialog');
    expect(within(inspector).getByRole('radio', { name: 'This layout' })).toBeDisabled();
  });

  it('the Names tab renames the labels this item shows', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Customize' }));
    await user.click(screen.getByRole('button', { name: 'Customize Reconciliation queue' }));
    const inspector = screen.getByRole('dialog');
    await user.click(within(inspector).getByRole('tab', { name: 'Names' }));
    expect(within(inspector).getByRole('row', { name: 'status.label.DOWN' })).toBeInTheDocument();
  });

  it('view-only clients never see Customize', () => {
    const store = createCustomizationStore({ api: fakeApi() });
    render(
      <CustomizationProvider store={store}>
        <CustomizeToggle />
      </CustomizationProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Customize' })).not.toBeInTheDocument();
  });
});
