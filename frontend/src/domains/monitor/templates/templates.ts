import type { MonitorDefinition } from '@/shared/api/types';
import { messages } from '@/shared/i18n/i18n';

/** FE-32: ready-made monitors. Templates never carry secrets or connection ids. */
export interface MonitorTemplate {
  id: string;
  nameKey: 'templates.springHealth' | 'templates.oracleLocks';
  definition: MonitorDefinition;
}

const BASE = { groupId: '', intervalSeconds: 60, timeoutSeconds: 5, retries: 2, fields: [] };

export const MONITOR_TEMPLATES: readonly MonitorTemplate[] = [
  {
    id: 'spring-actuator-health',
    nameKey: 'templates.springHealth',
    definition: {
      ...BASE,
      name: 'Spring Actuator health',
      type: 'HTTP',
      method: 'GET',
      url: 'http://localhost:8080/actuator/health',
      headers: { Accept: 'application/json' },
      conditions: [
        { field: '[STATUS]', operator: '==', value: '200', level: 'DOWN' },
        { field: '$.status', operator: '==', value: 'UP', level: 'DOWN' },
        { field: '[RESPONSE_TIME]', operator: '<', value: '800ms', level: 'WARN' },
      ],
    },
  },
  {
    id: 'oracle-blocking-locks',
    nameKey: 'templates.oracleLocks',
    definition: {
      ...BASE,
      name: 'Oracle blocking locks',
      type: 'SQL',
      connectionId: '',
      sql: 'SELECT s.SID, s.USERNAME, s.SECONDS_IN_WAIT FROM V$SESSION s WHERE s.BLOCKING_SESSION IS NOT NULL',
      conditions: [{ field: '[ROWS]', operator: '==', value: '0', level: 'DOWN' }],
    },
  },
];

export function templateById(id: string): MonitorTemplate | undefined {
  return MONITOR_TEMPLATES.find((t) => t.id === id);
}

function isVaultPlaceholder(value: string): boolean {
  return value.includes('••••');
}

/**
 * Clone wizard: drops the id, prefixes the name and never copies vault placeholders
 * (secrets come back from the API only as `•••• (vault)` and must be typed again).
 */
export function cloneDefinition(definition: MonitorDefinition, copyOf: string = messages('en').templates.copyOf): MonitorDefinition {
  const { id: _id, ...rest } = structuredClone(definition);
  const copy = { ...rest, name: copyOf.replace('{{name}}', definition.name) } as MonitorDefinition;
  if (copy.type === 'HTTP') {
    copy.headers = Object.fromEntries(Object.entries(copy.headers).filter(([, value]) => !isVaultPlaceholder(value)));
  }
  return copy;
}
