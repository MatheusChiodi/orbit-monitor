import { describe, expect, it } from 'vitest';
import { canEdit, parseAccess } from './access';

describe('canEdit', () => {
  it('only edit mode edits', () => {
    expect(canEdit('edit')).toBe(true);
    expect(canEdit('view-only')).toBe(false);
  });
});

describe('parseAccess', () => {
  it('accepts the API payload', () => {
    expect(parseAccess({ mode: 'edit', client: 'loopback' })).toEqual({ mode: 'edit', client: 'loopback' });
  });
  it('anything unexpected is view-only (fail closed)', () => {
    expect(parseAccess({ mode: 'admin' })).toEqual({ mode: 'view-only', client: 'unknown' });
    expect(parseAccess(null)).toEqual({ mode: 'view-only', client: 'unknown' });
  });
});
