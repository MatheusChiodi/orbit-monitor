import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { translate } from '@/shared/i18n/message';
import { AnimationLevelScope } from '@/shared/motion';
import { safeText } from '@/shared/privacy';
import {
  DISPLAY_MODES,
  compatibleModes,
  dataShape,
  incompatibilityReason,
  privacyReason,
  suggestMode,
  type DisplayModeId,
  type Surface,
} from '../compatibility';
import { MODE_COMPONENTS } from '../modes';
import type { VizData } from '../types';

export interface VisualizationPickerProps {
  field: { field: string; label: string };
  /** The field's real data from the preview run. */
  data: VizData;
  selected?: DisplayModeId;
  onSelect: (mode: DisplayModeId) => void;
  /** `wall` never offers card or personal data (LGPD / PCI DSS). */
  surface?: Surface;
}

/**
 * FE-21: the field's real data drawn in every compatible mode side by side, as one radio group.
 * Previews never animate (up to 20 charts on one screen); incompatible modes stay visible, disabled, with the reason.
 */
export function VisualizationPicker({ field, data, selected, onSelect, surface = 'console' }: VisualizationPickerProps) {
  const { t } = useTranslation();
  const name = useId();
  const shape = dataShape(data);
  const suggested = suggestMode(shape, { surface });
  const blocked = privacyReason(shape, surface);
  const pci = shape.dataClass === 'PCI_PAN' || shape.dataClass === 'PCI_SAD';
  const title = t('viz.picker.title', { field: safeText(field.label) });
  const empty = compatibleModes(shape).length === 0;

  if (empty) {
    return (
      <section aria-label={title} className="rounded-[0.9rem] border border-dashed border-line-2 p-[1.2rem] text-center text-[0.85rem] text-muted">
        {t('viz.picker.empty')}
      </section>
    );
  }

  const reasons = new Map(DISPLAY_MODES.map((mode) => [mode, incompatibilityReason(mode, shape, { surface })]));
  const enabled = DISPLAY_MODES.filter((mode) => reasons.get(mode) === null);
  const disabledModes = DISPLAY_MODES.filter((mode) => reasons.get(mode) !== null);
  const option = (mode: DisplayModeId) => {
    const reason = reasons.get(mode) ?? null;
    const disabled = reason !== null;
    const Preview = MODE_COMPONENTS[mode];
    const id = `${name}-${mode}`;
    return (
      <div
        key={mode}
        data-mode={mode}
        data-selected={selected === mode ? 'true' : undefined}
        onClick={disabled ? undefined : () => onSelect(mode)}
        className={`flex flex-col gap-[0.5rem] rounded-[0.9rem] border ${disabled ? 'px-[0.6rem] py-[0.45rem]' : 'p-[0.5rem]'} transition-colors duration-[120ms] ${
          selected === mode ? 'border-info bg-info/8' : 'border-line'
        } ${disabled ? 'opacity-55' : 'hover:border-line-2'}`}
      >
        <label htmlFor={id} className={`flex items-center gap-[0.5rem] text-[0.82rem] ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            id={id}
            type="radio"
            name={name}
            value={mode}
            checked={selected === mode}
            disabled={disabled}
            onChange={() => onSelect(mode)}
            className="accent-[var(--info)]"
          />
          <span className="font-semibold">{t(`viz.modes.${mode}`)}</span>
          {suggested === mode && (
            <span className="ml-auto rounded-full bg-info/15 px-[0.5rem] py-[0.1rem] text-[0.68rem] font-semibold text-info">{t('viz.picker.suggested')}</span>
          )}
        </label>
        {disabled ? (
          // Shape-wide privacy reasons are stated once above the grid.
          !blocked && <p className="m-0 text-[0.75rem] text-muted">{translate(t, reason)}</p>
        ) : (
          <Preview data={data} animation="off" />
        )}
      </div>
    );
  };

  return (
    <AnimationLevelScope level="off">
      <div className="flex flex-col gap-[0.8rem]">
        {(blocked || pci) && (
          <p role="note" className="m-0 rounded-[0.5rem] border border-info/40 bg-info/10 px-[0.8rem] py-[0.5rem] text-[0.8rem]">
            {translate(t, blocked ?? { key: 'viz.reasons.pci' })}
          </p>
        )}
        <div role="radiogroup" aria-label={title} className="flex flex-col gap-[0.8rem]">
          {/* Compatible modes first, as large previews; the rest stay listed, disabled, with their reason. */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] items-start gap-[0.8rem]">{enabled.map(option)}</div>
          {disabledModes.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] items-start gap-[0.5rem]">{disabledModes.map(option)}</div>
          )}
        </div>
      </div>
    </AnimationLevelScope>
  );
}
