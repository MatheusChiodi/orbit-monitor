/** Pending-test convention (docs/05-extended-features.md §3): suites for features not built yet. */
export const PENDING_PATTERN = 'src/**/*.pending.test.{ts,tsx}';

const ALWAYS_EXCLUDED = ['**/node_modules/**', '**/dist/**'];

export function testFiles(mode: string): { include: string[]; exclude: string[] } {
  if (mode === 'pending') return { include: [PENDING_PATTERN], exclude: ALWAYS_EXCLUDED };
  return { include: ['src/**/*.test.{ts,tsx}'], exclude: [...ALWAYS_EXCLUDED, PENDING_PATTERN] };
}
