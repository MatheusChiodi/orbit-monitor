import { describe, expect, it } from 'vitest';
import { targetUrlOf } from './monitorTarget';

describe('open-target URL', () => {
  it('only http(s) URLs are opened', () => {
    expect(targetUrlOf({ url: 'https://portal.example/health' })).toBe('https://portal.example/health');
    expect(targetUrlOf({ url: 'javascript:alert(1)' })).toBeNull();
    expect(targetUrlOf({ sql: 'SELECT 1' })).toBeNull();
    expect(targetUrlOf(undefined)).toBeNull();
  });
});
