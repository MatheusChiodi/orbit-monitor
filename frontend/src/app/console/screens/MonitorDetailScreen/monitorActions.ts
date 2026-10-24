import { buildDefinition, stateFromDefinition } from '@/domains/monitor/form';
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
  const loaded = stateFromDefinition(definition);
  const built = buildDefinition(loaded.state);
  const kept = loaded.keptConditions.map((c) => ({ expression: c.expression, level: c.level }));
  const body = { ...built, ...loaded.extras, conditions: [...built.conditions, ...kept], paused };
  return body as unknown as MonitorDefinition;
}
