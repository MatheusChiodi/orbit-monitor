import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import type { Status } from '@/shared/api/types';
import { AnimationLevelScope } from '@/shared/motion/animationLevel';
import { presetName, settingsFor, type MotionSettings } from '@/shared/motion/motionSettings';
import type { PreferencesStore } from '@/shared/preferences/preferences';
import { Button, FlashValue, LABEL_CLASS, Panel, SELECT_CLASS, StatusPill } from '@/shared/ui';

export interface MotionSettingsPanelProps {
  store: PreferencesStore;
  /** The system asks for reduced motion: everything stays off (FE-06 precedence). */
  reducedMotion: boolean;
}

const SWITCHES = ['transitions', 'feedback', 'attention', 'background', 'intros', 'hover'] as const;
const FX = ['off', 'low', 'high'] as const;
const STATES: Status[] = ['OK', 'WARN', 'DOWN'];
const VALUES = [42, 57, 31];

/** FE-06 (§1.2): every animation control for this device, with a live preview rendered with the same settings. */
export function MotionSettingsPanel({ store, reducedMotion }: MotionSettingsPanelProps) {
  const { t } = useTranslation();
  const ids = { intensity: useId(), speed: useId(), fx: useId() };
  const level = useStore(store, (s) => s.effective.animation);
  const stored = useStore(store, (s) => s.effective.motion);
  const overrides = stored ?? {};
  const setMotion = useStore(store, (s) => s.setMotion);
  const setPreset = useStore(store, (s) => s.setAnimationPreset);
  const settings = settingsFor(level, overrides);
  const name = presetName(level, overrides);
  const disabled = reducedMotion || level === 'off';
  const [step, setStep] = useState(0);
  const [incident, setIncident] = useState(false);
  const set = (patch: Partial<MotionSettings>) => setMotion(patch);

  return (
    <Panel title={t('screens.motion.title')}>
      <div className="flex flex-col gap-[0.8rem]">
        <p className="m-0 text-[0.85rem]">
          {t('screens.motion.preset')}: {name === 'custom' ? t('screens.motion.custom') : t(`preferences.animationLevels.${name}`)}
        </p>
        {reducedMotion && <p className="m-0 text-[0.78rem] text-warn-text">{t('preferences.reducedMotion')}</p>}
        <div className="grid grid-cols-1 gap-[0.8rem] sm:grid-cols-3">
          <div className={LABEL_CLASS}>
            <label htmlFor={ids.intensity}>{t('screens.motion.intensity')}</label>
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
            />
          </div>
          <div className={LABEL_CLASS}>
            <label htmlFor={ids.speed}>{t('screens.motion.speed')}</label>
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
            />
          </div>
          <div className={LABEL_CLASS}>
            <label htmlFor={ids.fx}>{t('screens.motion.fx')}</label>
            <select id={ids.fx} className={SELECT_CLASS} disabled={disabled} value={settings.fx} onChange={(e) => set({ fx: e.target.value as MotionSettings['fx'] })}>
              {FX.map((fx) => (
                <option key={fx} value={fx}>
                  {t(`screens.motion.fxLevels.${fx}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-[0.4rem] sm:grid-cols-2">
          {SWITCHES.map((key) => (
            <label key={key} className="flex items-center gap-[0.45rem] text-[0.85rem]">
              <input type="checkbox" disabled={disabled} checked={settings[key]} onChange={(e) => set({ [key]: e.target.checked })} />
              {t(`screens.motion.${key}`)}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-[0.6rem]">
          <Button onClick={() => setPreset('minimal')}>{t('screens.motion.reduce')}</Button>
          <span className="text-[0.75rem] text-dim">{t('screens.motion.precedence')}</span>
        </div>

        <section aria-label={t('screens.motion.preview')} className="rounded-[0.6rem] border border-line p-[0.8rem]">
          <AnimationLevelScope level={reducedMotion ? 'off' : level} settings={settings}>
            <div className="flex flex-wrap items-center gap-[0.8rem]">
              <span className="text-[0.85rem] font-semibold">{t('screens.motion.sampleCard')}</span>
              <StatusPill status={STATES[step]!} />
              <FlashValue value={VALUES[step]!}>
                <span className="font-mono">{VALUES[step]}</span>
              </FlashValue>
              <span
                data-attention={incident ? (settings.attention && !disabled ? 'blink' : 'static') : undefined}
                aria-hidden
                className={`inline-block h-[0.7rem] w-[0.7rem] rounded-full ${incident ? 'bg-down' : 'bg-ok'} ${incident && settings.attention && !disabled ? 'anim-blink' : ''}`}
              />
            </div>
            <div className="mt-[0.6rem] flex flex-wrap gap-[0.5rem]">
              <Button variant="ghost" onClick={() => setStep((s) => (s + 1) % STATES.length)}>
                {t('screens.motion.play')}
              </Button>
              <Button variant="ghost" aria-pressed={incident} onClick={() => setIncident((v) => !v)}>
                {t('screens.motion.simulate')}
              </Button>
            </div>
          </AnimationLevelScope>
        </section>
      </div>
    </Panel>
  );
}
