import { buildDefinition, duplicateOf, stateFromDefinition, type LoadedMonitor } from '@/domains/monitor/form';
import type { MonitorDefinition } from '@/shared/api/types';

type Definition = Record<string, unknown>;

/** Whether a saved definition (`GET /api/monitors/{id}`) is paused. */
export function isPaused(definition: Definition | undefined): boolean {
  return definition?.paused === true;
}

/**
 * The save body that pauses or resumes a monitor. The API has no pause endpoint, so the definition is
 * sent back as the edit form would save it: settings the form does not edit and conditions it cannot
 * show travel unchanged, masked secrets stay masked (the server keeps the stored ones).
 */
export function pausedBody(definition: Definition, paused: boolean): MonitorDefinition {
  return { ...bodyOf(stateFromDefinition(definition)), paused } as unknown as MonitorDefinition;
}

/** A new monitor (no id, not paused) copied from a saved one; masked secrets are left out and typed again in Edit. */
export function duplicateBody(definition: Definition, name: string): MonitorDefinition {
  return bodyOf(duplicateOf(stateFromDefinition(definition), name));
}

/** The id of a saved monitor: `POST /api/monitors` answers with the detail (`{ definition: { id } }`). */
export function savedMonitorId(response: unknown): string | null {
  const record = response && typeof response === 'object' ? (response as Record<string, unknown>) : {};
  const definition = record.definition && typeof record.definition === 'object' ? (record.definition as Record<string, unknown>) : record;
  return typeof definition.id === 'string' ? definition.id : null;
}

function bodyOf(loaded: LoadedMonitor): MonitorDefinition {
  const built = buildDefinition(loaded.state);
  const kept = loaded.keptConditions.map((c) => ({ expression: c.expression, level: c.level }));
  const body = { ...built, ...loaded.extras, conditions: [...built.conditions, ...kept] };
  return body as unknown as MonitorDefinition;
}
