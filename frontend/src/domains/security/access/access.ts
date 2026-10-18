import type { AccessInfo, AccessMode } from '@/shared/api/types';

export function canEdit(mode: AccessMode): boolean {
  return mode === 'edit';
}

const CLIENTS: ReadonlySet<string> = new Set(['loopback', 'lan', 'unknown']);

/** Validates the `/api/access` payload; anything unexpected is treated as view-only. */
export function parseAccess(data: unknown): AccessInfo {
  if (data && typeof data === 'object' && 'mode' in data && (data.mode === 'edit' || data.mode === 'view-only')) {
    const client = 'client' in data && typeof data.client === 'string' && CLIENTS.has(data.client) ? data.client : 'unknown';
    return { mode: data.mode, client: client as AccessInfo['client'] };
  }
  return { mode: 'view-only', client: 'unknown' };
}
