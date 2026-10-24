import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { IconSettings } from '@/shared/ui/icons/IconSettings';
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

/** FE-53: gear handle shown on a customizable item while Customize mode is on (nothing otherwise). */
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
      className={`ml-1.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border ${active ? 'border-accent bg-accent text-on-accent' : 'border-accent/60 bg-s2 text-accent hover:bg-accent/20'}`}
    >
      <IconSettings />
    </button>
  );
}
