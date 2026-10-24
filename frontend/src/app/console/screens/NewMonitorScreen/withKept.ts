import type { LoadedMonitor } from '@/domains/monitor/form';
import type { MonitorDefinition } from '@/shared/api/types';

/**
 * The saved settings the form does not edit (pause, hysteresis, window…) and the rules it cannot show go
 * back to the server unchanged. Kept rules travel as `{ expression, level }`, which `POST /api/monitors`
 * accepts next to `field/operator/value` (MonitorRequest.ConditionRequest).
 */
export function withKept(definition: MonitorDefinition, loaded: LoadedMonitor): MonitorDefinition {
  const conditions = [...definition.conditions, ...loaded.keptConditions] as MonitorDefinition['conditions'];
  return { ...loaded.extras, ...definition, conditions } as MonitorDefinition;
}
