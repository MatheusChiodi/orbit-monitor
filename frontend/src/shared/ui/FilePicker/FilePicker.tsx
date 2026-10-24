import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../Button/Button';
import { useFieldControlProps } from '../Field/Field';
import { IconButton } from '../IconButton/IconButton';
import { IconClose, IconUpload } from '../icons';

export interface FilePickerProps {
  /** e.g. ".json" or "application/json". */
  accept?: string;
  onFile: (file: File | null) => void;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  className?: string;
}

/** Styled single-file picker: translated button + chosen file name (never the browser's own text). */
export function FilePicker({ accept, onFile, disabled = false, className = '', ...rest }: FilePickerProps) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const field = useFieldControlProps(rest);
  const clear = () => {
    if (input.current) input.current.value = '';
    setName(null);
    onFile(null);
  };
  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <input
        ref={input}
        type="file"
        accept={accept}
        disabled={disabled}
        {...rest}
        {...field}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          setName(file?.name ?? null);
          onFile(file);
        }}
      />
      <Button size="sm" disabled={disabled} onClick={() => input.current?.click()}>
        <IconUpload />
        {t('ui.filePicker.choose')}
      </Button>
      <span className={`min-w-0 truncate text-sm ${name ? 'font-mono text-text' : 'text-dim'}`}>{name ?? t('ui.filePicker.none')}</span>
      {name && <IconButton label={t('ui.filePicker.clear')} icon={IconClose} size="sm" onClick={clear} />}
    </div>
  );
}
