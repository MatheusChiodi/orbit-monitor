import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fromEntries, type CustomizationApi } from '@/shared/customization/api';
import { createCustomizationStore } from '@/shared/customization/store';
import { SettingsEditor } from './SettingsEditor';

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

beforeEach(() => localStorage.clear());

describe('SettingsEditor (generated from the registry)', () => {
  it('renders one section per category with a control per setting', () => {
    render(<SettingsEditor store={createCustomizationStore({ api: fakeApi() })} editable />);
    expect(screen.getByRole('heading', { name: 'Typography' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cards and components' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Corner radius' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Glass panels' })).toBeChecked();
    expect(screen.getByRole('spinbutton', { name: 'Base text size' })).toHaveValue(15);
  });

  it('searches by label and id', async () => {
    const user = userEvent.setup();
    render(<SettingsEditor store={createCustomizationStore({ api: fakeApi() })} editable />);
    await user.type(screen.getByRole('searchbox', { name: 'Search settings' }), 'click');
    expect(screen.getByRole('combobox', { name: 'On click' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Corner radius' })).not.toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox', { name: 'Search settings' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search settings' }), 'zzzz');
    expect(screen.getByText('No setting matches your search.')).toBeInTheDocument();
  });

  it('changes a device value, marks it modified and resets it', async () => {
    const user = userEvent.setup();
    const store = createCustomizationStore({ api: fakeApi() });
    render(<SettingsEditor store={store} editable />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Corner radius' }), 'sharp');
    expect(store.getState().device['shape.radius']).toBe('sharp');
    await user.click(screen.getByRole('checkbox', { name: 'Modified only' }));
    expect(screen.getByRole('combobox', { name: 'Corner radius' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Glass panels' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset Corner radius' }));
    expect(store.getState().device['shape.radius']).toBeUndefined();
  });

  it('writes the workspace scope through the API and resets a category', async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    const store = createCustomizationStore({ api });
    render(<SettingsEditor store={store} editable />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Editing' }), 'workspace');
    await user.click(screen.getByRole('checkbox', { name: 'Glass panels' }));
    expect(api.saveScope).toHaveBeenCalledWith('workspace', null, { 'shape.glass': false });
    await user.click(screen.getByRole('button', { name: 'Reset Shape and surface' }));
    expect(api.deleteEntry).toHaveBeenCalledWith('workspace');
  });

  it('keeps the state field required in ordered lists and reorders the others', async () => {
    const user = userEvent.setup();
    const store = createCustomizationStore({ api: fakeApi() });
    render(<SettingsEditor store={store} editable />);
    const fields = screen.getByRole('group', { name: 'Fields shown' });
    expect(within(fields).getByRole('checkbox', { name: 'State' })).toBeDisabled();
    await user.click(within(fields).getByRole('checkbox', { name: 'Type' }));
    expect(store.getState().device['card.monitor.fields']).toEqual(['status', 'name', 'value', 'rule']);
    await user.click(within(fields).getByRole('button', { name: 'Move Rule up' }));
    expect(store.getState().device['card.monitor.fields']).toEqual(['status', 'name', 'rule', 'value']);
  });

  it('is read-only for view-only clients', () => {
    render(<SettingsEditor store={createCustomizationStore({ api: fakeApi() })} editable={false} />);
    expect(screen.getByText(/view-only/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Corner radius' })).toBeDisabled();
  });

  it('switches to the JSON view and applies validated JSON', async () => {
    const user = userEvent.setup();
    const store = createCustomizationStore({ api: fakeApi() });
    render(<SettingsEditor store={store} editable />);
    await user.click(screen.getByRole('button', { name: 'JSON view' }));
    const box = screen.getByRole('textbox', { name: 'Settings for This device as JSON' });
    expect(box).toHaveValue('{}');
    await user.clear(box);
    await user.click(box);
    await user.paste('{"shape.glass": false, "pan.reveal": true}');
    await user.click(screen.getByRole('button', { name: 'Apply JSON' }));
    expect(store.getState().device).toEqual({ 'shape.glass': false });
    expect(screen.getByText('1 unknown or invalid key was ignored')).toBeInTheDocument();
    await user.clear(box);
    await user.click(box);
    await user.paste('{oops');
    await user.click(screen.getByRole('button', { name: 'Apply JSON' }));
    expect(screen.getByRole('alert')).toHaveTextContent('This is not valid JSON');
  });

  it('offers the layout scope when layouts exist', async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    render(<SettingsEditor store={createCustomizationStore({ api })} editable layoutIds={['noc', 'exec']} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Editing' }), 'layout');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Layout' }), 'exec');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Card size' }), 'compact');
    expect(api.saveScope).toHaveBeenCalledWith('layout', 'exec', { 'card.monitor.variant': 'compact' });
  });
});
