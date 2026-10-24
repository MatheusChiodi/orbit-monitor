import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { ToastViewport, dismissAllToasts } from '@/shared/ui';
import { createPreferencesStore } from '@/shared/preferences/preferences';
import { GeneralSettings, type SettingsApi } from './GeneralSettings';

function api(overrides: Partial<SettingsApi> = {}): SettingsApi {
  return {
    getAccess: vi.fn().mockResolvedValue({ mode: 'edit', client: 'loopback' }),
    getSettings: vi.fn().mockResolvedValue({
      version: 1,
      items: [{ id: 'workspace', defaultLocale: 'en', theme: 'orbit-dark', animationLevel: 'standard', density: 'comfortable', historyHours: 24 }],
    }),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getConfigHealth: vi.fn().mockResolvedValue([
      { file: 'orbit.selects.json', state: 'ok', items: 3 },
      { file: 'orbit.layouts.json', state: 'missing', items: 0 },
      { file: 'orbit.channels.json', state: 'invalid', items: 0, error: 'line 4: unexpected token' },
    ]),
    exportConfig: vi.fn().mockResolvedValue(new Blob(['{}'], { type: 'application/json' })),
    previewImport: vi.fn().mockResolvedValue([{ file: 'selects', added: ['c'], changed: ['a'], removed: [] }]),
    applyImport: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const withToasts = (ui: ReactElement) => (
  <>
    {ui}
    <ToastViewport />
  </>
);

afterEach(() => dismissAllToasts());

describe('FE-72 Settings › General (CORE-19)', () => {
  it('states the access mode as information, not as a setting', async () => {
    render(<GeneralSettings api={api()} />);
    expect(await screen.findByText('You can change settings: Orbit runs on this machine.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByLabelText('Operator name')).toBeNull();
  });

  it('view-only clients see why and cannot change workspace defaults or import', async () => {
    render(<GeneralSettings api={api({ getAccess: vi.fn().mockResolvedValue({ mode: 'view-only', client: 'lan' }) })} />);
    expect(await screen.findByText('View-only: edits are allowed only on the machine running Orbit')).toBeInTheDocument();
    expect(screen.getByLabelText('Default language')).toBeDisabled();
    expect(screen.queryByLabelText('Import configuration')).toBeNull();
  });

  it('the device language goes through the device preferences', async () => {
    const preferences = createPreferencesStore();
    render(<GeneralSettings api={api()} preferences={preferences} />);
    await userEvent.selectOptions(await screen.findByLabelText('Language on this device'), 'pt-BR');
    expect(preferences.getState().device.locale).toBe('pt-BR');
  });

  it('saves the workspace language default and confirms with a toast', async () => {
    const a = api();
    render(withToasts(<GeneralSettings api={a} />));
    await userEvent.selectOptions(await screen.findByLabelText('Default language'), 'pt-BR');
    await userEvent.click(screen.getByRole('button', { name: 'Save defaults' }));
    expect(a.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ defaultLocale: 'pt-BR' }));
    expect(await screen.findByText('Workspace defaults saved')).toBeInTheDocument();
  });

  it('does not duplicate the Appearance controls', async () => {
    render(<GeneralSettings api={api()} />);
    await screen.findByLabelText('Default language');
    expect(screen.queryByLabelText('Default animation level')).toBeNull();
    expect(screen.queryByLabelText('Default density')).toBeNull();
  });

  it('lists config file health: ok, not created yet and invalid', async () => {
    render(<GeneralSettings api={api()} />);
    const health = await screen.findByRole('table', { name: 'Configuration files' });
    expect(within(health).getByText('orbit.layouts.json').closest('tr')).toHaveTextContent('Not created yet');
    expect(within(health).getByText('orbit.channels.json').closest('tr')).toHaveTextContent('line 4: unexpected token');
  });

  it('exports the configuration without secrets', async () => {
    const a = api();
    render(<GeneralSettings api={a} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Export configuration' }));
    expect(a.exportConfig).toHaveBeenCalled();
    expect(screen.getByText('Downloads a .zip of every file. Secrets are left out.')).toBeInTheDocument();
  });

  it('imports through the styled file picker: dry-run diff first, then apply', async () => {
    const a = api();
    render(withToasts(<GeneralSettings api={a} />));
    const file = new File([new Uint8Array([80, 75, 3, 4])], 'orbit-config.zip', { type: 'application/zip' });
    expect(await screen.findByRole('button', { name: 'Choose file' })).toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText('Import configuration'), file);
    const diff = await screen.findByRole('region', { name: 'Changes in this file' });
    expect(a.previewImport).toHaveBeenCalledWith(file);
    expect(within(diff).getByText('1 added · 1 changed · 0 removed')).toBeInTheDocument();
    expect(a.applyImport).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Apply import' }));
    expect(a.applyImport).toHaveBeenCalledWith(file);
    expect(await screen.findByText('Configuration imported')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Changes in this file' })).toBeNull();
  });

  it('an archive identical to the current config says so and offers no apply', async () => {
    render(<GeneralSettings api={api({ previewImport: vi.fn().mockResolvedValue([]) })} />);
    const file = new File([new Uint8Array([80, 75])], 'orbit-config.zip', { type: 'application/zip' });
    await userEvent.upload(await screen.findByLabelText('Import configuration'), file);
    expect(await screen.findByText('This file matches the current configuration: nothing to import.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply import' })).toBeNull();
  });

  it('a failing config health endpoint does not block the screen', async () => {
    render(<GeneralSettings api={api({ getConfigHealth: vi.fn().mockRejectedValue(new Error('unavailable')) })} />);
    expect(await screen.findByRole('button', { name: 'Export configuration' })).toBeInTheDocument();
  });

  it('never stores configuration in the browser', async () => {
    localStorage.clear();
    render(<GeneralSettings api={api()} />);
    await screen.findByRole('table', { name: 'Configuration files' });
    expect(Object.keys(localStorage).every((k) => k === 'orbit.locale')).toBe(true);
  });

  it('renders in pt-BR, including the file picker', async () => {
    renderWithLocale(<GeneralSettings api={api()} />, 'pt-BR');
    expect(await screen.findByRole('button', { name: 'Exportar configuração' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Arquivos de configuração' })).toBeInTheDocument();
    expect(screen.queryByText('Choose File')).toBeNull();
  });
});
