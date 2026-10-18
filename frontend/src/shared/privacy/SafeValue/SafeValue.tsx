import { useId, type ClipboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { detectSensitive, redact, type DataClass, type ProbeValue, type RedactOptions } from '../redact';

const EMPTY = '—';

export interface SafeValueState {
  text: string;
  masked: boolean;
  dataClass: DataClass | null;
}

/** Redacts a probe value; every probe value must pass through this before reaching the DOM. */
export function useSafeValue(
  value: ProbeValue,
  field?: string,
  format?: (value: ProbeValue) => string,
  surface: RedactOptions['surface'] = 'console',
): SafeValueState {
  if (value === null || value === undefined) return { text: EMPTY, masked: false, dataClass: null };
  const dataClass = detectSensitive(value, field);
  if (!dataClass) return { text: format ? format(value) : String(value), masked: false, dataClass: null };
  return { text: String(redact(value, field, { surface })), masked: true, dataClass };
}

export interface SafeValueProps {
  value: ProbeValue;
  /** Field / column name, used to classify (e.g. `cvv`, `email`). */
  field?: string;
  /** Formats non-sensitive values only (sensitive ones are always shown masked). */
  format?: (value: ProbeValue) => string;
  /** `wall` hides personal data entirely. */
  surface?: RedactOptions['surface'];
  className?: string;
}

const NOTICE: Record<DataClass, 'privacy.pciNotice' | 'privacy.personalNotice' | 'privacy.vault'> = {
  PCI_PAN: 'privacy.pciNotice',
  PCI_SAD: 'privacy.pciNotice',
  PERSONAL: 'privacy.personalNotice',
  SECRET: 'privacy.vault',
};

export function SafeValue({ value, field, format, surface = 'console', className = '' }: SafeValueProps) {
  const { t } = useTranslation();
  const noticeId = useId();
  const { text, masked, dataClass } = useSafeValue(value, field, format, surface);
  if (!masked || !dataClass) return <span className={className}>{text}</span>;

  // Copying a masked value copies the masked text only.
  const onCopy = (event: ClipboardEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.clipboardData.setData('text/plain', text);
  };

  return (
    <>
      <span data-masked="true" data-class={dataClass} aria-describedby={noticeId} onCopy={onCopy} className={className}>
        {text}
      </span>
      <span id={noticeId} hidden>
        {t(NOTICE[dataClass])}
      </span>
    </>
  );
}
