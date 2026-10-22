import { useId } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { translate } from '@/shared/i18n/message';
import { Badge } from '@/shared/ui';
import { checkSelect } from '../../sql';

export interface SqlEditorProps {
  value: string;
  onChange: (sql: string) => void;
}

const GUARDS = ['sql.guard.selectOnly', 'sql.guard.timeout', 'sql.guard.maxRows', 'sql.guard.vault'] as const;

/** SELECT editor with the guards always visible and instant validation. */
export function SqlEditor({ value, onChange }: SqlEditorProps) {
  const { t } = useTranslation();
  const errorId = useId();
  const enter = useMotionPreset('enter');
  const error = value.trim() === '' ? null : checkSelect(value);
  return (
    <div className="flex flex-col gap-[0.5rem]">
      <textarea
        aria-label={t('sql.label')}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="SELECT COUNT(*) AS PENDING_QTY FROM V_RECONCILIATION_PENDING"
        className="min-h-[9rem] w-full resize-y rounded-[0.45rem] border border-line-2 bg-bg p-[0.7rem] font-mono text-[0.85rem] text-text placeholder:text-dim focus:border-info focus:outline-none aria-invalid:border-down"
      />
      <ul className="m-0 flex list-none flex-wrap gap-[0.4rem] p-0" aria-label={t('sql.guards')}>
        {GUARDS.map((guard) => (
          <li key={guard}>
            <Badge tone="INFO">{t(guard)}</Badge>
          </li>
        ))}
      </ul>
      <AnimatePresence>
      {error && (
        <m.p
          key="error"
          initial={enter.initial}
          animate={enter.animate}
          exit={enter.exit}
          transition={enter.transition}
          data-motion-level={enter.level}
          id={errorId}
          role="alert"
          className="m-0 text-[0.85rem] text-down-text"
        >
          {translate(t, error)}
        </m.p>
      )}
      </AnimatePresence>
    </div>
  );
}
