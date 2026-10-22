import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithLocale } from '@/test/renderWithLocale';
import { SettingsScreen, type SettingsApi } from './SettingsScreen';

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

describe('CORE-19 settings and config files', () => {
  it('shows the access mode and no operator name', async () => {
    render(<SettingsScreen api={api()} />);
    expect(await screen.findByText('Edit mode: this machine runs Orbit')).toBeInTheDocument();
    expect(screen.queryByLabelText('Operator name')).toBeNull();
  });

  it('view-only clients see the banner and cannot change workspace defaults', async () => {
    render(<SettingsScreen api={api({ getAccess: vi.fn().mockResolvedValue({ mode: 'view-only', client: 'lan' }) })} />);
    expect(await screen.findByText('View-only: edits are allowed only on the machine running Orbit')).toBeInTheDocument();
    expect(screen.getByLabelText('Default language')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Import config' })).toBeNull();
  });

  it('edits workspace defaults through /api/settings', async () => {
    const a = api();
    render(<SettingsScreen api={a} />);
    await userEvent.selectOptions(await screen.findByLabelText('Default language'), 'pt-BR');
    await userEvent.click(screen.getByRole('button', { name: 'Save defaults' }));
    expect(a.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ defaultLocale: 'pt-BR' }));
  });

  it('edits the workspace animation level and density defaults (BE-40)', async () => {
    const a = api();
    render(<SettingsScreen api={a} />);
    await userEvent.selectOptions(await screen.findByLabelText('Default animation level'), 'minimal');
    await userEvent.selectOptions(screen.getByLabelText('Default density'), 'compact');
    await userEvent.click(screen.getByRole('button', { name: 'Save defaults' }));
    expect(a.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ animationLevel: 'minimal', density: 'compact' }));
  });

  it('config file health lists ok, missing (empty, not an error) and invalid files', async () => {
    render(<SettingsScreen api={api()} />);
    const health = await screen.findByRole('table', { name: 'Config files' });
    expect(within(health).getByText('orbit.layouts.json').closest('tr')).toHaveTextContent('Not created yet');
    expect(within(health).getByText('orbit.channels.json').closest('tr')).toHaveTextContent('line 4: unexpected token');
  });

  it('Export config downloads a file without secrets', async () => {
    const a = api();
    render(<SettingsScreen api={a} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Export config' }));
    expect(a.exportConfig).toHaveBeenCalled();
    expect(screen.getByText('Secrets are never exported')).toBeInTheDocument();
  });

  it('Import config sends the zip for a dry-run diff before applying', async () => {
    const a = api();
    render(<SettingsScreen api={a} />);
    const file = new File([new Uint8Array([80, 75, 3, 4])], 'orbit-config.zip', { type: 'application/zip' });
    await userEvent.upload(await screen.findByLabelText('Import config'), file);
    const diff = await screen.findByRole('region', { name: 'Import preview' });
    expect(a.previewImport).toHaveBeenCalledWith(file);
    expect(within(diff).getByText('selects')).toBeInTheDocument();
    expect(within(diff).getByText('1 added · 1 changed · 0 removed')).toBeInTheDocument();
    expect(a.applyImport).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Apply import' }));
    expect(a.applyImport).toHaveBeenCalledWith(file);
    expect(await screen.findByText('Configuration imported')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Import preview' })).toBeNull();
  });

  it('an archive identical to the current config says so and offers no apply', async () => {
    render(<SettingsScreen api={api({ previewImport: vi.fn().mockResolvedValue([]) })} />);
    const file = new File([new Uint8Array([80, 75])], 'orbit-config.zip', { type: 'application/zip' });
    await userEvent.upload(await screen.findByLabelText('Import config'), file);
    expect(await screen.findByText('The archive matches the current configuration.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply import' })).toBeNull();
  });

  it('a failing config health endpoint does not block the screen', async () => {
    render(<SettingsScreen api={api({ getConfigHealth: vi.fn().mockRejectedValue(new Error('unavailable')) })} />);
    expect(await screen.findByRole('button', { name: 'Export config' })).toBeInTheDocument();
  });

  it('never stores configuration in the browser', async () => {
    localStorage.clear();
    render(<SettingsScreen api={api()} />);
    await screen.findByRole('table', { name: 'Config files' });
    const keys = Object.keys(localStorage);
    expect(keys.every((k) => k === 'orbit.locale')).toBe(true);
  });

  it('renders in pt-BR', async () => {
    renderWithLocale(<SettingsScreen api={api()} />, 'pt-BR');
    expect(await screen.findByRole('button', { name: 'Exportar configuração' })).toBeInTheDocument();
    expect(screen.getByText('Segredos nunca são exportados')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Arquivos de configuração' })).toBeInTheDocument();
  });
});
