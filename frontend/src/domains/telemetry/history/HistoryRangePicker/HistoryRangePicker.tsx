import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { TextInput } from '@/shared/ui/TextInput';
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
 * FE-58: 24 h / 7 d / 30 d / custom period for charts, SLA and incident pages. Presets are the
 * SegmentedControl radio group (arrow keys move and select); the custom period uses datetime inputs.
 */
export function HistoryRangePicker({ value, onChange, now = () => new Date() }: HistoryRangePickerProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<RangePreset>(value.preset);
  const [from, setFrom] = useState(toLocalInput(value.from));
  const [to, setTo] = useState(toLocalInput(value.to));
  const [error, setError] = useState<RangeError | null>(null);

  function choose(preset: RangePreset) {
    setSelected(preset);
    setError(null);
    if (preset !== 'custom') onChange(presetRange(preset, now()));
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
    <div className="flex flex-col gap-3">
      <SegmentedControl
        label={t('historyRange.label')}
        size="sm"
        value={selected}
        onChange={choose}
        options={PRESETS.map((preset) => ({ value: preset, label: t(`historyRange.presets.${preset}`) }))}
      />
      {selected === 'custom' && (
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t('historyRange.from')}>
            <TextInput type="datetime-local" value={from} aria-invalid={error !== null} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label={t('historyRange.to')}>
            <TextInput type="datetime-local" value={to} aria-invalid={error !== null} onChange={(event) => setTo(event.target.value)} />
          </Field>
          <Button variant="secondary" onClick={apply}>
            {t('historyRange.apply')}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm text-down-text">
          {t(`historyRange.errors.${error}`)}
        </p>
      )}
    </div>
  );
}
