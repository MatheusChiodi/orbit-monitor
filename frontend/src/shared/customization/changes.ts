import { valueForScope } from './registry';
import type { CustomizationLayers } from './resolve';
import type { Scope, SettingValue, SettingValues } from './types';

/** FE-53 apply-scope chooser: one item, all items of its type, this layout, this device or the workspace. */
export const APPLY_TO = ['instance', 'type', 'layout', 'device', 'workspace'] as const;
export type ApplyTo = (typeof APPLY_TO)[number];

export interface PendingChange {
  id: string;
  value: SettingValue;
  applyTo: ApplyTo;
  /** `<type>:<id>` of the selected item. */
  instanceId: string | null;
  layoutId: string | null;
}

export function scopeOf(applyTo: ApplyTo): Scope {
  return applyTo === 'type' ? 'workspace' : applyTo;
}

/** Whether a change can land at that scope (setting scopes, an item or layout to attach to). */
export function canApply(id: string, applyTo: ApplyTo, value: unknown, instanceId: string | null, layoutId: string | null): boolean {
  if (applyTo === 'instance' && !instanceId) return false;
  if (applyTo === 'layout' && !layoutId) return false;
  return valueForScope(id, scopeOf(applyTo), value) !== undefined;
}

function put(map: Readonly<Record<string, SettingValues>>, key: string, id: string, value: SettingValue): Record<string, SettingValues> {
  return { ...map, [key]: { ...map[key], [id]: value } };
}

/** Layers as they would be after saving these changes (live preview and Save). */
export function applyChanges(base: CustomizationLayers, changes: readonly PendingChange[]): CustomizationLayers {
  let next: CustomizationLayers = { ...base };
  for (const change of changes) {
    const { id, applyTo, instanceId, layoutId } = change;
    if (!canApply(id, applyTo, change.value, instanceId, layoutId)) continue;
    const value = valueForScope(id, scopeOf(applyTo), change.value)!;
    if (applyTo === 'instance') next = { ...next, instances: put(next.instances, instanceId!, id, value) };
    else if (applyTo === 'layout') next = { ...next, layouts: put(next.layouts, layoutId!, id, value) };
    else if (applyTo === 'device') next = { ...next, device: { ...next.device, [id]: value } };
    else {
      next = { ...next, workspace: { ...next.workspace, [id]: value } };
      if (applyTo === 'type' && instanceId) {
        const prefix = `${instanceId.split(':')[0]}:`;
        const instances: Record<string, SettingValues> = {};
        for (const [key, values] of Object.entries(next.instances)) {
          const rest = key.startsWith(prefix) ? Object.fromEntries(Object.entries(values).filter(([k]) => k !== id)) : values;
          if (Object.keys(rest).length > 0) instances[key] = rest;
        }
        next = { ...next, instances };
      }
    }
  }
  return next;
}
