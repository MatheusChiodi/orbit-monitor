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

describe('FE-50 device preferences — screen', () => {
  it('lists theme, animation level, density, language, viewing scale and operator name', () => {
    setup();
    for (const label of ['Theme', 'Animation level', 'Density', 'Language', 'Viewing distance', 'Operator name']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('explains that preferences stay on this device', () => {
    setup();
    expect(screen.getByText('Saved on this device only. Workspace defaults apply to anything you leave unchanged.')).toBeInTheDocument();
  });

  it('changing a value persists it on the device', async () => {
    setup();
    await userEvent.selectOptions(screen.getByLabelText('Density'), 'compact');
    expect(loadPreferences()).toEqual({ density: 'compact' });
  });

  it('marks values that come from the workspace defaults', () => {
    setup();
    expect(screen.getAllByText('workspace default').length).toBeGreaterThan(0);
  });

  it('warns when reduced motion caps the animation level', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    setup();
    expect(screen.getByText('Your system asks for reduced motion, so animations stay off.')).toBeInTheDocument();
  });

  it('exports a JSON file and imports one back', async () => {
    const createObjectURL = vi.fn(() => 'blob:prefs');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const store = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Export preferences' }));
    expect(createObjectURL).toHaveBeenCalled();
    const file = new File([JSON.stringify({ version: 1, preferences: { scale: '5m' } })], 'prefs.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText('Import preferences'), file);
    expect(await screen.findByRole('status')).toHaveTextContent('Preferences imported');
    expect(store.getState().effective.scale).toBe('5m');
  });

  it('an invalid import shows an error and keeps the current preferences', async () => {
    const store = setup();
    await userEvent.upload(screen.getByLabelText('Import preferences'), new File(['nope'], 'x.json', { type: 'application/json' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This file is not valid JSON');
    expect(store.getState().effective).toMatchObject(defaults);
  });

  it('reset returns to the workspace defaults', async () => {
    const store = setup();
    await userEvent.selectOptions(screen.getByLabelText('Density'), 'spacious');
    await userEvent.click(screen.getByRole('button', { name: 'Reset to workspace defaults' }));
    expect(store.getState().effective.density).toBe('comfortable');
  });

  it('renders in pt-BR', () => {
    renderWithLocale(<DevicePreferences store={createPreferencesStore(defaults)} />, 'pt-BR');
    expect(screen.getByLabelText('Nível de animação')).toBeInTheDocument();
    expect(screen.getByLabelText('Densidade')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar preferências' })).toBeInTheDocument();
  });
});
