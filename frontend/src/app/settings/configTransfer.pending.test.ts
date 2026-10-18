import { describe, expect, it } from 'vitest';
import { diffConfig, exportFileName, stripSecrets } from './configTransfer';

describe('CORE-19 config export / import', () => {
  it('export strips every secret (enc, ${env:} refs and vault markers)', () => {
    const exported = stripSecrets({
      connections: {
        version: 1,
        items: [{ id: 'con_1', user: 'orbit_ro', password: { enc: 'v1:abc' } }, { id: 'con_2', password: '${env:DB_PASS}' }],
      },
      channels: { version: 1, items: [{ id: 'ch_1', webhookSecret: { vault: true } }] },
    });
    const text = JSON.stringify(exported);
    expect(text).not.toContain('v1:abc');
    expect(text).not.toContain('DB_PASS');
    expect(exported.connections?.items[0]).toEqual({ id: 'con_1', user: 'orbit_ro' });
  });

  it('dry-run diff lists added, changed and removed items per file', () => {
    const current = { selects: { version: 1, items: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] } };
    const incoming = { selects: { version: 1, items: [{ id: 'a', name: 'A2' }, { id: 'c', name: 'C' }] } };
    expect(diffConfig(current, incoming)).toEqual([
      { file: 'selects', added: ['c'], changed: ['a'], removed: ['b'] },
    ]);
  });

  it('files that do not change are not listed', () => {
    const same = { themes: { version: 1, items: [{ id: 't' }] } };
    expect(diffConfig(same, same)).toEqual([]);
  });

  it('export file name carries the date', () => {
    expect(exportFileName(new Date(2026, 9, 18))).toBe('orbit-config-2026-10-18.json');
  });
});
