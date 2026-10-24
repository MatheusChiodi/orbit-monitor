import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { useCustomization } from '@/shared/customization/CustomizationProvider';
import { ANIMATION_LEVELS, systemPrefersReducedMotion } from '@/shared/motion/animationLevel';
import { DENSITIES } from '@/shared/preferences/density';
import type { PreferencesStore } from '@/shared/preferences/preferences';
import { SegmentedControl, type SegmentedControlProps } from '@/shared/ui';

export interface DisplayControlsProps {
  preferences: PreferencesStore;
}

/** Text size steps over the FE-56 `typography.scale` setting (device scope). */
export const TEXT_SIZES = { small: 0.9, default: 1, large: 1.15, larger: 1.3 } as const;
export type TextSize = keyof typeof TEXT_SIZES;
const TEXT_SIZE_IDS = Object.keys(TEXT_SIZES) as TextSize[];
export const TEXT_SCALE_SETTING = 'typography.scale';

export function nearestTextSize(scale: unknown): TextSize {
  const value = typeof scale === 'number' ? scale : 1;
  return TEXT_SIZE_IDS.reduce((best, id) => (Math.abs(TEXT_SIZES[id] - value) < Math.abs(TEXT_SIZES[best] - value) ? id : best), 'default');
}

/** Visible label above a segmented control (the radiogroup keeps the same accessible name). */
function Labelled<V extends string>(props: SegmentedControlProps<V>) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span aria-hidden="true" className="text-sm font-medium text-muted">
        {props.label}
      </span>
      <SegmentedControl {...props} className="self-start" />
    </div>
  );
}

/** FE-72: density, text size and the one animation control; each applies to this device right away. */
export function DisplayControls({ preferences }: DisplayControlsProps) {
  const { t } = useTranslation();
  const { store } = useCustomization();
  const density = useStore(preferences, (s) => s.effective.density);
  const animation = useStore(preferences, (s) => s.effective.animation);
  const scale = useStore(store, (s) => s.resolve(TEXT_SCALE_SETTING).value);
  const reduced = systemPrefersReducedMotion();

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Labelled
        label={t('settingsHub.appearance.density')}
        value={density}
        onChange={(value) => preferences.getState().set('density', value)}
        options={DENSITIES.map((d) => ({ value: d, label: t(`preferences.densities.${d}`) }))}
      />
      <Labelled
        label={t('settingsHub.appearance.textSize')}
        value={nearestTextSize(scale)}
        onChange={(value) => void store.getState().setValue('device', TEXT_SCALE_SETTING, TEXT_SIZES[value])}
        options={TEXT_SIZE_IDS.map((id) => ({ value: id, label: t(`settingsHub.appearance.textSizes.${id}`) }))}
      />
      <div className="flex flex-col gap-1.5">
        <Labelled
          label={t('settingsHub.appearance.animation')}
          value={animation}
          onChange={(value) => preferences.getState().setAnimationPreset(value)}
          options={ANIMATION_LEVELS.map((level) => ({ value: level, label: t(`preferences.animationLevels.${level}`) }))}
        />
        <p className="m-0 text-xs text-dim">{reduced ? t('preferences.reducedMotion') : t('settingsHub.appearance.animationHint')}</p>
      </div>
    </div>
  );
}
