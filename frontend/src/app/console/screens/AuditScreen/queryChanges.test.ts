import { describe, expect, it } from 'vitest';
import type { AuditEntry } from '@/shared/api/consoleTypes';
import { clientOf, toQueryChanges } from './queryChanges';

const entry = (at: string, detail: string, operator = 'Ana', remoteAddress = '127.0.0.1'): AuditEntry => ({
  at,
  operator,
  action: 'sql.save',
  target: 'm1',
  detail,
  remoteAddress,
});

describe('FE-36 query history from the audit trail', () => {
  it('pairs consecutive saves of the same SELECT, newest change first, skipping saves that did not change it', () => {
    const changes = toQueryChanges([
      entry('2026-10-22T12:00:00Z', 'SELECT 3', 'Bia', '192.168.0.9'),
      entry('2026-10-22T10:00:00Z', 'SELECT 1'),
      entry('2026-10-22T11:00:00Z', 'SELECT 2'),
      entry('2026-10-22T11:30:00Z', 'SELECT 2'),
    ]);
    expect(changes).toEqual([
      { before: 'SELECT 2', after: 'SELECT 3', operator: 'Bia', client: 'lan', at: '2026-10-22T12:00:00Z' },
      { before: 'SELECT 1', after: 'SELECT 2', operator: 'Ana', client: 'loopback', at: '2026-10-22T11:00:00Z' },
    ]);
  });

  it('classifies the client address', () => {
    expect(clientOf('127.0.0.1')).toBe('loopback');
    expect(clientOf('0:0:0:0:0:0:0:1')).toBe('loopback');
    expect(clientOf('::1')).toBe('loopback');
    expect(clientOf('10.0.0.2')).toBe('lan');
    expect(clientOf(null)).toBe('unknown');
  });
});
