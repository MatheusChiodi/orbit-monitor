import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPreferencesStore, loadPreferences } from '@/shared/preferences/preferences';
import { renderWithLocale } from '@/test/renderWithLocale';
import { DevicePreferences } from './DevicePreferences';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const defaults = { theme: 'orbit-dark', animation: 'standard', density: 'comfortable', locale: 'en', scale: '3m' } as const;

function setup() {
  const store = createPreferencesStore(defaults);
  render(<DevicePreferences store={store} />);
  return store;
}

describe('FE-50 device preferences — Settings › Advanced', () => {
  it('keeps only what Appearance and General do not show: viewing distance and the device file', () => {
    setup();
    expect(screen.getByLabelText('Viewing distance')).toBeInTheDocument();
    for (const label of ['Theme', 'Animation level', 'Density', 'Language']) expect(screen.queryByLabelText(label)).toBeNull();
    expect(screen.queryByLabelText('Operator name')).toBeNull();
  });

  it('explains what the viewing distance does', () => {
    setup();
    expect(screen.getByText(/makes text and charts bigger for screens seen from farther away/)).toBeInTheDocument();
  });

  it('changing the distance persists it on the device', async () => {
    setup();
    await userEvent.selectOptions(screen.getByLabelText('Viewing distance'), '5m');
    expect(loadPreferences()).toEqual({ scale: '5m' });
  });

  it('exports a JSON file and imports one back', async () => {
    const createObjectURL = vi.fn(() => 'blob:prefs');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const store = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Export device preferences' }));
    expect(createObjectURL).toHaveBeenCalled();
    const file = new File([JSON.stringify({ version: 1, preferences: { scale: '5m' } })], 'prefs.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText('Import device preferences'), file);
    expect(await screen.findByRole('status')).toHaveTextContent('Preferences imported');
    expect(store.getState().effective.scale).toBe('5m');
  });

  it('an invalid import shows an error and keeps the current preferences', async () => {
    const store = setup();
    await userEvent.upload(screen.getByLabelText('Import device preferences'), new File(['nope'], 'x.json', { type: 'application/json' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This file is not valid JSON');
    expect(store.getState().effective).toMatchObject(defaults);
  });

  it('reset returns this device to the workspace defaults', async () => {
    const store = setup();
    store.getState().set('density', 'spacious');
    await userEvent.click(screen.getByRole('button', { name: 'Reset this device' }));
    expect(store.getState().effective.density).toBe('comfortable');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<DevicePreferences store={createPreferencesStore(defaults)} />, 'pt-BR');
    expect(screen.getByLabelText('Distância de visualização')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar preferências do dispositivo' })).toBeInTheDocument();
  });
});
