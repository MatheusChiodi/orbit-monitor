/** FE-46: the wall greys out after this long without updates. */
export const STALE_AFTER_MS = 60_000;

export function isStale(updatedAt: string | null, now: Date, staleAfterMs = STALE_AFTER_MS): boolean {
  if (!updatedAt) return true;
  return now.getTime() - Date.parse(updatedAt) > staleAfterMs;
}
