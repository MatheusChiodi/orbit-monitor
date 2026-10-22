import { describe, expect, it, vi } from 'vitest';
import type { ConsoleSource } from '../../consoleSource';
import { toSettingsApi } from './settingsApi';

function source(overrides: Partial<ConsoleSource> = {}) {
  return {
    getAccess: vi.fn().mockResolvedValue({ mode: 'edit', client: 'loopback' }),
    getSettings: vi.fn().mockResolvedValue({ id: 'default', locale: 'pt-BR', historyHours: 24, access: { editFrom: 'loopback', cidrs: [], lanAcknowledge: true } }),
    saveSettings: vi.fn().mockResolvedValue({}),
    getConfigHealth: vi.fn().mockResolvedValue([]),
    exportConfig: vi.fn(),
    importConfig: vi.fn().mockResolvedValue([{ file: 'orbit.groups.json', added: [], changed: ['g'], removed: [] }]),
    ...overrides,
  } as unknown as ConsoleSource;
}

describe('CORE-19 settings adapter', () => {
  it('maps orbit.settings.json (locale) to the workspace defaults (defaultLocale)', async () => {
    const file = await toSettingsApi(source()).getSettings();
    expect(file.items[0]).toMatchObject({ id: 'default', defaultLocale: 'pt-BR', historyHours: 24 });
  });

  it('saving keeps the fields the screen does not edit (access policy) and writes locale back', async () => {
    const s = source();
    const api = toSettingsApi(s);
    await api.getSettings();
    await api.saveSettings({ id: 'default', defaultLocale: 'en' });
    expect(s.saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'default', locale: 'en', access: { editFrom: 'loopback', cidrs: [], lanAcknowledge: true } }),
    );
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
