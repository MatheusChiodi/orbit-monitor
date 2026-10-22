import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { createCustomizeModeStore } from './customizeMode';
import { useCustomization } from './CustomizationProvider';
import { createCustomizationStore } from './store';
import type { ComponentType } from './types';

export interface CustomizeHandleProps {
  type: ComponentType;
  targetId: string;
  /** Plain name of the item (already safe to show: monitor or group name through `safeText`). */
  label: string;
}

const idle = createCustomizeModeStore(createCustomizationStore({ storage: false }));

/** FE-53: ⚙ handle shown on a customizable item while Customize mode is on (nothing otherwise). */
export function CustomizeHandle({ type, targetId, label }: CustomizeHandleProps) {
  const { t } = useTranslation();
  const { mode } = useCustomization();
  const enabled = useStore(mode ?? idle, (s) => s.enabled);
  const selected = useStore(mode ?? idle, (s) => s.selected);
  if (!mode || !enabled) return null;
  const active = selected?.type === type && selected.targetId === targetId;
  return (
    <button
      type="button"
      data-customize-handle
      aria-label={t('customization.mode.handle', { name: label })}
      aria-pressed={active}
      onClick={(event) => {
        event.stopPropagation();
        mode.getState().select({ type, targetId, label });
      }}
      className={`ml-[0.35rem] inline-flex h-[1.4rem] w-[1.4rem] shrink-0 items-center justify-center rounded-full border text-[0.75rem] ${active ? 'border-info bg-info text-bg' : 'border-info/60 bg-s2 text-info hover:bg-info/20'}`}
    >
      <span aria-hidden>⚙</span>
    </button>
  );
}
