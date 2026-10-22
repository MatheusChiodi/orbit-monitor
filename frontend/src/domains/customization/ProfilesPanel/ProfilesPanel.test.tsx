import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fromEntries, type CustomizationApi } from '@/shared/customization/api';
import { createCustomizationStore } from '@/shared/customization/store';
import { renderWithLocale } from '@/test/renderWithLocale';
import { ProfilesPanel } from './ProfilesPanel';

function fakeApi(): CustomizationApi {
  return {
    load: vi.fn(async () => ({ ...fromEntries([]), profiles: [{ id: 'profile:night', name: 'Night shift', settings: { 'shape.glass': false } }] })),
    saveScope: vi.fn(async () => undefined),
    deleteEntry: vi.fn(async () => undefined),
    saveProfile: vi.fn(async () => undefined),
    loadTerminology: vi.fn(async () => ({ en: {}, 'pt-BR': {} })),
    saveTerminology: vi.fn(async () => undefined),
  };
}

async function setup(layoutIds: string[] = []) {
  const api = fakeApi();
  const store = createCustomizationStore({ api });
  await store.getState().load();
  render(<ProfilesPanel store={store} editable layoutIds={layoutIds} />);
  return { api, store };
}

beforeEach(() => localStorage.clear());

describe('FE-57 profiles panel', () => {
  it('lists the built-in and custom profiles', async () => {
    await setup();
    for (const name of ['Orbit default', 'TV wall', 'Compact console', 'Accessible', 'Night shift']) {
      expect(screen.getByRole('article', { name })).toBeInTheDocument();
    }
    expect(within(screen.getByRole('article', { name: 'Accessible' })).getByText('Built in')).toBeInTheDocument();
  });

  it('applies a profile to this device', async () => {
    const user = userEvent.setup();
    const { store } = await setup();
    await user.click(within(screen.getByRole('article', { name: 'Accessible' })).getByRole('button', { name: 'Apply' }));
    expect(store.getState().device['shape.borderWidth']).toBe('thick');
    expect(screen.getByRole('status')).toHaveTextContent('Accessible applied to This device');
  });

  it('applies a profile to a wall layout', async () => {
    const user = userEvent.setup();
    const { api } = await setup(['noc']);
    const card = screen.getByRole('article', { name: 'TV wall' });
    await user.selectOptions(within(card).getByRole('combobox', { name: 'Apply TV wall to' }), 'layout:noc');
    await user.click(within(card).getByRole('button', { name: 'Apply' }));
    expect(api.saveScope).toHaveBeenCalledWith('layout', 'noc', expect.objectContaining({ 'shape.glass': false }));
  });

  it('saves the device settings as a profile, duplicates and deletes custom ones', async () => {
    const user = userEvent.setup();
    const { api, store } = await setup();
    store.getState().setValue('device', 'shape.radius', 'sharp');
    await user.type(screen.getByRole('textbox', { name: 'Profile name' }), 'Payments team');
    await user.click(screen.getByRole('button', { name: 'Save current device settings as a profile' }));
    expect(api.saveProfile).toHaveBeenCalledWith({ id: 'profile:payments-team', name: 'Payments team', settings: { 'shape.radius': 'sharp' } });
    await user.click(within(screen.getByRole('article', { name: 'Accessible' })).getByRole('button', { name: 'Duplicate' }));
    expect(api.saveProfile).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Accessible (copy)' }));
    await user.click(within(screen.getByRole('article', { name: 'Night shift' })).getByRole('button', { name: 'Delete' }));
    expect(api.deleteEntry).toHaveBeenCalledWith('profile:night');
    expect(screen.queryByRole('article', { name: 'Night shift' })).not.toBeInTheDocument();
  });

  it('imports a profile file and reports invalid files', async () => {
    const user = userEvent.setup();
    const { api } = await setup();
    const good = new File([JSON.stringify({ format: 'orbit.customization-profile', version: 1, name: 'Executive', values: { 'typography.scale': 1.1 } })], 'p.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText('Import profile'), good);
    expect(await screen.findByText('Executive imported')).toBeInTheDocument();
    expect(api.saveProfile).toHaveBeenCalledWith({ id: 'profile:executive', name: 'Executive', settings: { 'typography.scale': 1.1 } });
    await user.upload(screen.getByLabelText('Import profile'), new File(['nope'], 'bad.json', { type: 'application/json' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This file is not valid JSON');
  });

  it('renders in pt-BR', async () => {
    const store = createCustomizationStore({ api: fakeApi() });
    renderWithLocale(<ProfilesPanel store={store} editable />, 'pt-BR');
    expect(screen.getByRole('article', { name: 'Parede de TV' })).toBeInTheDocument();
  });
});
