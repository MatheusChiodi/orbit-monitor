import { describe, expect, it } from 'vitest';
import { PENDING_PATTERN, testFiles } from '../../testFiles';

describe('pending tests convention (docs/05-extended-features.md §3)', () => {
  it('the default run excludes *.pending.test.ts(x)', () => {
    const { include, exclude } = testFiles('test');
    expect(include).toEqual(['src/**/*.test.{ts,tsx}']);
    expect(exclude).toContain(PENDING_PATTERN);
  });

  it('`--mode pending` runs only the pending files', () => {
    const { include, exclude } = testFiles('pending');
    expect(include).toEqual([PENDING_PATTERN]);
    expect(exclude).not.toContain(PENDING_PATTERN);
  });
});
