import { createStore } from 'zustand/vanilla';
import { APPLY_TO, canApply, type ApplyTo, type PendingChange } from './changes';
import type { CustomizationStore } from './store';
import type { ComponentType } from './types';

export { applyChanges } from './changes';

/** FE-53: the item picked in Customize mode. */
export interface CustomizeTarget {
  type: ComponentType;
  /** Id of the monitor, group… (the instance id is `<type>:<targetId>`). */
  targetId: string;
  label: string;
}

export interface CustomizeModeState {
  enabled: boolean;
  selected: CustomizeTarget | null;
  applyTo: ApplyTo;
  changes: readonly PendingChange[];
  saving: boolean;
  toggle: (on?: boolean) => void;
  select: (target: CustomizeTarget | null) => void;
  setApplyTo: (applyTo: ApplyTo) => void;
  change: (id: string, value: unknown) => void;
  undo: () => void;
  discard: () => void;
  save: () => Promise<void>;
}

export function instanceIdOf(target: CustomizeTarget): string {
  return `${target.type}:${target.targetId}`;
}

/** Edits stay in memory (live preview) until Save; Discard and leaving the mode drop them. */
export function createCustomizeModeStore(store: CustomizationStore, layoutId: string | null = null) {
  return createStore<CustomizeModeState>()((set, get) => {
    const publish = (changes: readonly PendingChange[]) => {
      set({ changes });
      store.getState().setPending(changes);
    };
    return {
      enabled: false,
      selected: null,
      applyTo: 'instance',
      changes: [],
      saving: false,
      toggle(on) {
        const enabled = on ?? !get().enabled;
        if (!enabled) publish([]);
        set({ enabled, selected: enabled ? get().selected : null });
      },
      select: (selected) => set({ selected }),
      setApplyTo: (applyTo) => set({ applyTo }),
      change(id, value) {
        const { selected, applyTo } = get();
        const instanceId = selected ? instanceIdOf(selected) : null;
        const order = [applyTo, ...APPLY_TO.filter((a) => a !== applyTo)];
        const scope = order.find((a) => canApply(id, a, value, instanceId, layoutId));
        if (!scope) return;
        publish([...get().changes, { id, value: value as PendingChange['value'], applyTo: scope, instanceId, layoutId }]);
      },
      undo: () => publish(get().changes.slice(0, -1)),
      discard: () => publish([]),
      async save() {
        set({ saving: true });
        await store.getState().commitPending();
        set({ changes: [], saving: false });
      },
    };
  });
}

export type CustomizeModeStore = ReturnType<typeof createCustomizeModeStore>;
