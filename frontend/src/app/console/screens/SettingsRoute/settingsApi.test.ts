import { describe, expect, it, vi } from 'vitest';
import type { ConsoleSource } from '../../consoleSource';
import { toSettingsApi } from './settingsApi';

function source(overrides: Partial<ConsoleSource> = {}) {
  return {
    getAccess: vi.fn().mockResolvedValue({ mode: 'edit', client: 'loopback' }),
    getWorkspaceDefaults: vi.fn().mockResolvedValue({ theme: 'nord', animation: 'minimal', density: 'compact', locale: 'pt-BR', scale: '5m' }),
    saveWorkspaceDefaults: vi.fn().mockResolvedValue({}),
    getConfigHealth: vi.fn().mockResolvedValue([]),
    exportConfig: vi.fn(),
    importConfig: vi.fn().mockResolvedValue([{ file: 'orbit.groups.json', added: [], changed: ['g'], removed: [] }]),
    ...overrides,
  } as unknown as ConsoleSource;
}

describe('CORE-19 settings adapter', () => {
  it('reads the workspace defaults from /api/settings/defaults (BE-40)', async () => {
    const file = await toSettingsApi(source()).getSettings();
    expect(file.items[0]).toMatchObject({ defaultLocale: 'pt-BR', theme: 'nord', animationLevel: 'minimal', density: 'compact' });
  });

  it('saving writes every default back, keeping the ones the screen does not edit (scale)', async () => {
    const s = source();
    const api = toSettingsApi(s);
    await api.getSettings();
    await api.saveSettings({ id: 'default', defaultLocale: 'en', animationLevel: 'expressive', density: 'spacious', theme: 'nord' });
    expect(s.saveWorkspaceDefaults).toHaveBeenCalledWith({ theme: 'nord', animation: 'expressive', density: 'spacious', locale: 'en', scale: '5m' });
  });

  it('import preview and apply call the zip endpoint with dryRun true then false', async () => {
    const s = source();
    const api = toSettingsApi(s);
    const zip = new Blob(['PK']);
    expect(await api.previewImport(zip)).toEqual([{ file: 'orbit.groups.json', added: [], changed: ['g'], removed: [] }]);
    await api.applyImport(zip);
    expect(s.importConfig).toHaveBeenNthCalledWith(1, zip, true);
    expect(s.importConfig).toHaveBeenNthCalledWith(2, zip, false);
  });
});
