import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Status } from '@/shared/api/types';
import { translate } from '@/shared/i18n/message';
import { useLocale } from '@/shared/i18n/useLocale';
import { safeText } from '@/shared/privacy';
import { INPUT_CLASS, LABEL_CLASS, SELECT_CLASS } from '@/shared/ui/formStyles';
import { StatusPill } from '@/shared/ui/StatusPill';
import { TEXT_CLASS } from '@/shared/ui/tones';
import type { DisplayModeId } from '../compatibility';
import { deviationPct, ruleHolds } from '../core/format';
import {
  MAX_DECIMALS,
  ON_FAIL_OPTIONS,
  applySettings,
  bandStatus,
  validateSettings,
  type ColorBand,
  type OnFail,
  type VisualizationSettingsValue,
} from '../settings';
import { toStatus, type VizData } from '../types';

const STATES: Status[] = ['OK', 'WARN', 'DOWN'];

export interface VisualizationSettingsProps {
  mode: DisplayModeId;
  settings: VisualizationSettingsValue;
  /** Field data from the preview run, used for the live preview. */
  data: VizData;
  onChange: (settings: VisualizationSettingsValue) => void;
}

function parseNumber(text: string): number | undefined {
  if (text.trim() === '') return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

/** Band without `undefined` keys, so it serializes cleanly to `orbit.monitors.json`. */
function band(from: number | undefined, to: number | undefined, status: Status): ColorBand {
  return { ...(from !== undefined ? { from } : {}), ...(to !== undefined ? { to } : {}), status };
}

/** FE-23: color bands, decimals, prefix/suffix, min/max, threshold line and what to show when the rule fails, with a live preview. */
export function VisualizationSettings({ mode, settings, data, onChange }: VisualizationSettingsProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [draft, setDraft] = useState<VisualizationSettingsValue>(settings);
  const errors = validateSettings(draft);
  const bands = draft.bands ?? [];

  const update = (patch: Partial<VisualizationSettingsValue>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange(next);
  };
  const updateBand = (index: number, patch: Partial<ColorBand>) => {
    const merged = { ...bands[index]!, ...patch };
    update({ bands: bands.map((b, i) => (i === index ? band(merged.from, merged.to, merged.status) : b)) });
  };

  const value = data.value ?? null;
  const numeric = typeof value === 'number';
  const status = (numeric && bandStatus(value, bands)) || toStatus(data.status);
  const failing = numeric && data.rule !== undefined && !ruleHolds(value, data.rule);
  const onFail = draft.onFail ?? 'deviation';
  const deviation =
    failing && data.rule && onFail !== 'color'
      ? t(value > data.rule.limit ? 'rule.over' : 'rule.under', { pct: deviationPct(value, data.rule) })
      : null;
  const red = failing && onFail !== 'deviation';

  return (
    <div className="grid gap-[1rem] md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
      <div className="flex flex-col gap-[0.9rem]">
        <fieldset className="m-0 flex flex-col gap-[0.5rem] border-0 p-0">
          {bands.map((b, i) => (
            <fieldset key={i} aria-label={t('viz.settings.band', { n: i + 1 })} className="m-0 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-[0.5rem] border-0 p-0">
              <label className={LABEL_CLASS}>
                {t('viz.settings.from')}
                <input type="number" className={INPUT_CLASS} value={b.from ?? ''} onChange={(e) => updateBand(i, { from: parseNumber(e.target.value) })} />
              </label>
              <label className={LABEL_CLASS}>
                {t('viz.settings.upTo')}
                <input type="number" className={INPUT_CLASS} value={b.to ?? ''} onChange={(e) => updateBand(i, { to: parseNumber(e.target.value) })} />
              </label>
              <label className={LABEL_CLASS}>
                {t('viz.settings.state')}
                <select className={SELECT_CLASS} value={b.status} onChange={(e) => updateBand(i, { status: toStatus(e.target.value) })}>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {t(`status.label.${s}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => update({ bands: bands.filter((_, j) => j !== i) })}
                className="h-[2.2rem] rounded-[0.45rem] border border-line-2 px-[0.6rem] text-[0.8rem] text-muted hover:text-text"
              >
                {t('viz.settings.removeBand')}
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            onClick={() => update({ bands: [...bands, { status: 'OK' }] })}
            className="h-[2.2rem] w-fit rounded-[0.45rem] border border-dashed border-line-2 px-[0.8rem] text-[0.82rem] text-text hover:border-info"
          >
            {t('viz.settings.addBand')}
          </button>
        </fieldset>

        <div className="grid grid-cols-2 gap-[0.6rem] sm:grid-cols-3">
          <label className={LABEL_CLASS}>
            {t('viz.settings.decimals')}
            <input
              type="number"
              min={0}
              max={MAX_DECIMALS}
              className={INPUT_CLASS}
              value={draft.decimals ?? ''}
              onChange={(e) => {
                const n = parseNumber(e.target.value);
                update({ decimals: n === undefined ? undefined : Math.min(MAX_DECIMALS, Math.max(0, Math.round(n))) });
              }}
            />
          </label>
          <label className={LABEL_CLASS}>
            {t('viz.settings.prefix')}
            <input type="text" className={INPUT_CLASS} value={draft.prefix ?? ''} onChange={(e) => update({ prefix: safeText(e.target.value) })} />
          </label>
          <label className={LABEL_CLASS}>
            {t('viz.settings.suffix')}
            <input type="text" className={INPUT_CLASS} value={draft.suffix ?? ''} onChange={(e) => update({ suffix: safeText(e.target.value) })} />
          </label>
          <label className={LABEL_CLASS}>
            {t('viz.settings.min')}
            <input type="number" className={INPUT_CLASS} value={draft.min ?? ''} onChange={(e) => update({ min: parseNumber(e.target.value) })} />
          </label>
          <label className={LABEL_CLASS}>
            {t('viz.settings.max')}
            <input type="number" className={INPUT_CLASS} value={draft.max ?? ''} onChange={(e) => update({ max: parseNumber(e.target.value) })} />
          </label>
        </div>

        <label className="flex items-center gap-[0.5rem] text-[0.85rem]">
          <input type="checkbox" checked={draft.thresholdLine ?? true} onChange={(e) => update({ thresholdLine: e.target.checked })} />
          {t('viz.settings.thresholdLine')}
        </label>

        <label className={LABEL_CLASS}>
          {t('viz.settings.onFail')}
          <select className={SELECT_CLASS} value={onFail} onChange={(e) => update({ onFail: e.target.value as OnFail })}>
            {ON_FAIL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`viz.settings.onFailOptions.${option}`)}
              </option>
            ))}
          </select>
        </label>

        {errors.length > 0 && (
          <div role="alert" className="rounded-[0.45rem] border border-down/50 bg-down/10 px-[0.7rem] py-[0.45rem] text-[0.8rem] text-down-text">
            {errors.map((e) => (
              <p key={e.key} className="m-0">
                {translate(t, e)}
              </p>
            ))}
          </div>
        )}
      </div>

      <section aria-label={t('viz.settings.preview')} data-mode={mode} className="flex flex-col gap-[0.5rem] rounded-[0.9rem] border border-line bg-s1 p-[0.9rem]">
        <div className="flex items-center justify-between gap-[0.5rem]">
          <span className="truncate font-display text-[0.9rem] font-semibold">{safeText(data.label)}</span>
          <StatusPill status={status} className="text-[0.72rem]" />
        </div>
        <span className={`font-mono text-[1.6rem] font-semibold tabular-nums ${red ? TEXT_CLASS.DOWN : ''}`}>{applySettings(value, draft, locale)}</span>
        {deviation && <span className="font-mono text-[0.8rem] text-down-text tabular-nums">{deviation}</span>}
        <span className="text-[0.68rem] text-dim">{t(`viz.modes.${mode}`)}</span>
      </section>
    </div>
  );
}
