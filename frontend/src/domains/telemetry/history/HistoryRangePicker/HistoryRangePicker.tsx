import { useId, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { INPUT_CLASS, LABEL_CLASS } from '@/shared/ui/formStyles';
import {
  customRange,
  FIXED_PRESETS,
  fromLocalInput,
  presetRange,
  toLocalInput,
  type HistoryRange,
  type RangeError,
  type RangePreset,
} from '../range';

export interface HistoryRangePickerProps {
  value: HistoryRange;
  onChange: (range: HistoryRange) => void;
  /** Injected in tests; defaults to the current time. */
  now?: () => Date;
}

const PRESETS: readonly RangePreset[] = [...FIXED_PRESETS, 'custom'];

/**
 * FE-58: 24 h / 7 d / 30 d / custom period for charts, SLA and incident pages. Presets are a WAI-ARIA
 * radio group (arrow keys move and select); the custom period uses native datetime inputs.
 */
export function HistoryRangePicker({ value, onChange, now = () => new Date() }: HistoryRangePickerProps) {
  const { t } = useTranslation();
  const id = useId();
  const [selected, setSelected] = useState<RangePreset>(value.preset);
  const [from, setFrom] = useState(toLocalInput(value.from));
  const [to, setTo] = useState(toLocalInput(value.to));
  const [error, setError] = useState<RangeError | null>(null);

  function choose(preset: RangePreset) {
    setSelected(preset);
    setError(null);
    if (preset !== 'custom') onChange(presetRange(preset, now()));
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = PRESETS[(index + step + PRESETS.length) % PRESETS.length] ?? 'custom';
    choose(next);
    document.getElementById(`${id}-${next}`)?.focus();
  }

  function apply() {
    const result = customRange(fromLocalInput(from), fromLocalInput(to), now());
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    onChange(result.range);
  }

  return (
    <div className="flex flex-col gap-[0.6rem]">
      <div role="radiogroup" aria-label={t('historyRange.label')} className="inline-flex gap-[0.3rem]">
        {PRESETS.map((preset, index) => {
          const checked = selected === preset;
          return (
            <Button
              key={preset}
              id={`${id}-${preset}`}
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              variant={checked ? 'primary' : 'neutral'}
              onClick={() => choose(preset)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {t(`historyRange.presets.${preset}`)}
            </Button>
          );
        })}
      </div>
      {selected === 'custom' && (
        <div className="flex flex-wrap items-end gap-[0.6rem]">
          <label className={LABEL_CLASS}>
            {t('historyRange.from')}
            <input
              type="datetime-local"
              className={INPUT_CLASS}
              value={from}
              aria-invalid={error !== null}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className={LABEL_CLASS}>
            {t('historyRange.to')}
            <input
              type="datetime-local"
              className={INPUT_CLASS}
              value={to}
              aria-invalid={error !== null}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <Button variant="primary" onClick={apply}>
            {t('historyRange.apply')}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 text-[0.78rem] text-down">
          {t(`historyRange.errors.${error}`)}
        </p>
      )}
    </div>
  );
}
