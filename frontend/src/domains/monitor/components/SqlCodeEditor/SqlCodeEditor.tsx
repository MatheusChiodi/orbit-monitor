import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { translate } from '@/shared/i18n/message';
import { useMotionPreset } from '@/shared/motion/useMotionPreset';
import { Badge, Button } from '@/shared/ui';
import { checkSelect } from '../../sql';
import { formatSql, suggest, tokenizeSql, type SqlCatalog, type SqlSuggestion, type SqlTokenKind } from './sqlTokens';

export interface SqlCodeEditorProps {
  value: string;
  onChange: (sql: string) => void;
  catalog: SqlCatalog;
}

const GUARDS = ['sql.guard.selectOnly', 'sql.guard.timeout', 'sql.guard.maxRows', 'sql.guard.vault'] as const;

const TOKEN_CLASS: Record<SqlTokenKind, string> = {
  keyword: 'text-info',
  identifier: 'text-text',
  string: 'text-ok-text',
  number: 'text-warn-text',
  comment: 'text-dim',
  operator: 'text-muted',
  space: '',
};

const SHARED = 'm-0 min-h-[9rem] w-full whitespace-pre-wrap break-words p-[0.7rem] font-mono text-[0.85rem] leading-[1.5]';

/**
 * FE-33: SELECT editor with highlighting (a token layer under a transparent textarea), catalog
 * autocomplete (Ctrl+Space), Format and the safe-mode guard chips.
 */
export function SqlCodeEditor({ value, onChange, catalog }: SqlCodeEditorProps) {
  const { t } = useTranslation();
  const enter = useMotionPreset('enter');
  const listId = useId();
  const errorId = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<SqlSuggestion[] | null>(null);
  const [active, setActive] = useState(0);
  const error = value.trim() === '' ? null : checkSelect(value);

  // Caret position, tracked from selection events; starts at the end of the text.
  const caret = useRef<number | null>(null);
  function cursor(): number {
    return Math.min(caret.current ?? value.length, value.length);
  }
  function trackCaret() {
    caret.current = area.current?.selectionStart ?? null;
  }

  function insert(suggestion: SqlSuggestion) {
    const at = cursor();
    const before = value.slice(0, at);
    const prefix = /([\w$#]*)$/.exec(before)?.[1] ?? '';
    const head = `${before.slice(0, before.length - prefix.length)}${suggestion.label}`;
    caret.current = head.length;
    onChange(`${head}${value.slice(at)}`);
    setSuggestions(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.ctrlKey && event.key === ' ') {
      event.preventDefault();
      setSuggestions(suggest(value.slice(0, cursor()), catalog));
      setActive(0);
      return;
    }
    if (suggestions) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSuggestions(null);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (event.key === 'Enter') {
        const chosen = suggestions[active];
        if (chosen) {
          event.preventDefault();
          insert(chosen);
        }
      }
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const at = cursor();
      caret.current = at + 2;
      onChange(`${value.slice(0, at)}  ${value.slice(at)}`);
    }
  }

  const open = suggestions !== null && suggestions.length > 0;

  return (
    <div className="flex flex-col gap-[0.5rem]">
      <div className="relative rounded-[0.45rem] border border-line-2 bg-bg focus-within:border-info">
        <pre aria-hidden className={`${SHARED} pointer-events-none absolute inset-0 overflow-hidden`}>
          {tokenizeSql(value).map((token, i) => (
            <span key={i} data-token={token.kind} className={TOKEN_CLASS[token.kind]}>
              {token.text}
            </span>
          ))}
          {'\n'}
        </pre>
        <textarea
          ref={area}
          aria-label={t('sql.label')}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          spellCheck={false}
          value={value}
          onKeyUp={(e) => {
            if (/^(Arrow|Home|End|Page)/.test(e.key) && !open) trackCaret();
          }}
          onClick={trackCaret}
          onChange={(e) => {
            caret.current = e.target.selectionStart;
            onChange(e.target.value);
            setSuggestions(null);
          }}
          onKeyDown={onKeyDown}
          className={`${SHARED} relative resize-y bg-transparent text-transparent caret-text focus:outline-none`}
        />
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label={t('sql.suggestions')}
            className="absolute right-[0.5rem] bottom-[0.5rem] z-10 m-0 max-h-[10rem] list-none overflow-auto rounded-[0.45rem] border border-line-2 bg-s1 p-[0.25rem]"
          >
            {suggestions.map((s, i) => (
              <li
                key={`${s.kind}:${s.label}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insert(s);
                }}
                className={`cursor-pointer rounded-[0.3rem] px-[0.5rem] py-[0.2rem] font-mono text-[0.8rem] ${i === active ? 'bg-info/15' : ''}`}
              >
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-[0.4rem]">
        <ul className="m-0 flex list-none flex-wrap gap-[0.4rem] p-0" aria-label={t('sql.guards')}>
          {GUARDS.map((guard) => (
            <li key={guard}>
              <Badge tone="INFO">{t(guard)}</Badge>
            </li>
          ))}
        </ul>
        <Button variant="ghost" className="ml-auto" onClick={() => onChange(formatSql(value))}>
          {t('sql.format')}
        </Button>
      </div>
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
