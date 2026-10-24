import type { TFunction } from 'i18next';

/**
 * Areas of the "Action" filter. The API filters by action prefix (BE-46), so each area is the prefix its
 * actions share; monitor saves are recorded per kind (`sql.save`, `http.save`), deletes as `monitor.delete`.
 */
export const AUDIT_AREAS = [
  'sql',
  'http',
  'monitor',
  'incident',
  'maintenance',
  'dependency',
  'group',
  'status-page',
  'connection',
  'channel',
  'settings',
  'layout',
  'theme',
  'customization',
  'config',
] as const;

export type AuditArea = (typeof AUDIT_AREAS)[number];

/** Prefix sent to the API for an area (`incident` → `incident.`). */
export const areaPrefix = (area: string) => (area ? `${area}.` : '');

/** Human label of an audit action (`sql.save` → "Query monitor saved"); unknown actions stay as recorded. */
export function auditActionLabel(t: TFunction, action: string): string {
  if (!/^[a-z-]+\.[a-z-]+$/.test(action)) return action;
  return t(`ops.audit.actions.${action}`, { defaultValue: action }) as string;
}
