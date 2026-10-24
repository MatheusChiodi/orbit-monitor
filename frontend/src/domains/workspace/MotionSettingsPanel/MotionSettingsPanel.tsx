import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import type { Status } from '@/shared/api/types';
import { AnimationLevelScope } from '@/shared/motion/animationLevel';
import { presetName, settingsFor, type MotionSettings } from '@/shared/motion/motionSettings';
import type { PreferencesStore } from '@/shared/preferences/preferences';
import { Button, Card, Checkbox, Field, FlashValue, Select, StatusBadge } from '@/shared/ui';

export interface MotionSettingsPanelProps {
  store: PreferencesStore;
  /** The system asks for reduced motion: everything stays off (FE-06 precedence). */
  reducedMotion: boolean;
}

const SWITCHES = ['transitions', 'feedback', 'attention', 'background', 'intros', 'hover'] as const;
const FX = ['off', 'low', 'high'] as const;
const STATES: Status[] = ['OK', 'WARN', 'DOWN'];
const VALUES = [42, 57, 31];
const RANGE_CLASS = 'w-full accent-accent disabled:opacity-50';

/**
 * FE-06 (§1.2) in Settings › Advanced: the individual effects behind the animation level chosen in
 * Appearance, with a live preview rendered with the same settings.
 */
export function MotionSettingsPanel({ store, reducedMotion }: MotionSettingsPanelProps) {
  const { t } = useTranslation();
  const ids = { intensity: useId(), speed: useId() };
  const level = useStore(store, (s) => s.effective.animation);
  const stored = useStore(store, (s) => s.effective.motion);
  const overrides = stored ?? {};
  const setMotion = useStore(store, (s) => s.setMotion);
  const settings = settingsFor(level, overrides);
  const name = presetName(level, overrides);
  const disabled = reducedMotion || level === 'off';
  const [step, setStep] = useState(0);
  const [incident, setIncident] = useState(false);
  const set = (patch: Partial<MotionSettings>) => setMotion(patch);
  const blinking = incident && settings.attention && !disabled;

  return (
    <Card title={t('settingsHub.advanced.motion')}>
      <p className="m-0 text-sm text-muted">
        {t('screens.motion.preset')}: {name === 'custom' ? t('screens.motion.custom') : t(`preferences.animationLevels.${name}`)}
      </p>
      {reducedMotion && <p className="m-0 text-sm text-warn-text">{t('preferences.reducedMotion')}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.intensity} className="text-sm font-medium text-muted">
            {t('screens.motion.intensity')}
          </label>
          <input
            id={ids.intensity}
            type="range"
            min={0}
            max={100}
            step={5}
            disabled={disabled}
            value={settings.intensity}
            aria-valuetext={`${settings.intensity} %`}
            onChange={(e) => set({ intensity: Number(e.target.value) })}
            className={RANGE_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.speed} className="text-sm font-medium text-muted">
            {t('screens.motion.speed')}
          </label>
          <input
            id={ids.speed}
            type="range"
            min={0.5}
            max={1.5}
            step={0.25}
            disabled={disabled}
            value={settings.speed}
            aria-valuetext={`${settings.speed}×`}
            onChange={(e) => set({ speed: Number(e.target.value) })}
            className={RANGE_CLASS}
          />
        </div>
        <Field label={t('screens.motion.fx')}>
          <Select disabled={disabled} value={settings.fx} onChange={(e) => set({ fx: e.target.value as MotionSettings['fx'] })}>
            {FX.map((fx) => (
              <option key={fx} value={fx}>
                {t(`screens.motion.fxLevels.${fx}`)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SWITCHES.map((key) => (
          <Checkbox key={key} label={t(`screens.motion.${key}`)} disabled={disabled} checked={settings[key]} onChange={(e) => set({ [key]: e.target.checked })} />
        ))}
      </div>

      <section aria-label={t('screens.motion.preview')} className="rounded-md border border-line bg-s2 p-3">
        <AnimationLevelScope level={reducedMotion ? 'off' : level} settings={settings}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-base font-semibold">{t('screens.motion.sampleCard')}</span>
            <StatusBadge status={STATES[step]!} />
            <FlashValue value={VALUES[step]!}>
              <span className="font-mono">{VALUES[step]}</span>
            </FlashValue>
            <span
              data-attention={incident ? (blinking ? 'blink' : 'static') : undefined}
              aria-hidden
              className={`inline-block size-3 rounded-full ${incident ? 'bg-down' : 'bg-ok'} ${blinking ? 'anim-blink' : ''}`}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setStep((s) => (s + 1) % STATES.length)}>
              {t('screens.motion.play')}
            </Button>
            <Button size="sm" aria-pressed={incident} onClick={() => setIncident((v) => !v)}>
              {t('screens.motion.simulate')}
            </Button>
          </div>
        </AnimationLevelScope>
      </section>
    </Card>
  );
}
