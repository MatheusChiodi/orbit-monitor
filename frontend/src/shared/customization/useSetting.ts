import { useMemo } from 'react';
import { useStore } from 'zustand';
import { useCustomization } from './CustomizationProvider';
import type { ResolvedSetting } from './resolve';
import type { SettingValue } from './types';

export interface UseSettingOptions {
  /** `<componentType>:<id>`, e.g. `card.monitor:mon_1` (instance scope). */
  instanceId?: string | null;
}

/** CORE-21: the only way components read a customizable value (docs/07 §2). */
export function useResolvedSetting(id: string, options: UseSettingOptions = {}): ResolvedSetting {
  const { store, layoutId } = useCustomization();
  const state = useStore(store);
  const instanceId = options.instanceId ?? null;
  return useMemo(() => state.resolve(id, { instanceId, layoutId }), [state, id, instanceId, layoutId]);
}

export function useSetting<T extends SettingValue = SettingValue>(id: string, options: UseSettingOptions = {}): T {
  return useResolvedSetting(id, options).value as T;
}
