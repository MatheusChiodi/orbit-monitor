import { useId, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { safeText } from '@/shared/privacy/redact';
import { AnimatedItem, Button, INPUT_CLASS } from '@/shared/ui';
import { loadViews, saveViews, type SavedView, type ViewFilter } from './viewFilters';

export interface SavedViewsProps {
  /** Filter currently applied to the monitor list. */
  current: ViewFilter;
  activeId?: string;
  onApply: (view: SavedView) => void;
}

/** FE-30: named filters of the monitor list, kept on this device only. */
export function SavedViews({ current, activeId, onApply }: SavedViewsProps) {
  const { t } = useTranslation();
  const nameId = useId();
  const [views, setViews] = useState<SavedView[]>(loadViews);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  function update(next: SavedView[]) {
    setViews(next);
    saveViews(next);
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    update([...views, { id: `view-${Date.now()}`, name: trimmed, filter: current }]);
    setName('');
    setNaming(false);
  }

  return (
    <div className="flex flex-col gap-[0.5rem]">
      <div className="flex flex-wrap items-center gap-[0.4rem]">
        {views.length === 0 && <p className="m-0 text-[0.8rem] text-muted">{t('views.empty')}</p>}
        <ul className="m-0 flex list-none flex-wrap gap-[0.4rem] p-0">
          <AnimatePresence>
            {views.map((view, index) => (
              <AnimatedItem key={view.id} index={index} count={views.length} className="inline-flex items-center gap-[0.2rem]">
                <Button variant={view.id === activeId ? 'primary' : 'neutral'} aria-pressed={view.id === activeId} onClick={() => onApply(view)}>
                  <SafeValue value={view.name} />
                </Button>
                <Button variant="ghost" aria-label={t('views.delete', { name: safeText(view.name) })} onClick={() => setDeleting(view.id)}>
                  ✕
                </Button>
                {deleting === view.id && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      update(views.filter((v) => v.id !== view.id));
                      setDeleting(null);
                    }}
                  >
                    {t('views.confirmDelete')}
                  </Button>
                )}
              </AnimatedItem>
            ))}
          </AnimatePresence>
        </ul>
        {!naming && (
          <Button variant="ghost" onClick={() => setNaming(true)}>
            {t('views.save')}
          </Button>
        )}
      </div>
      {naming && (
        <span className="inline-flex items-center gap-[0.4rem]">
          <label htmlFor={nameId} className="sr-only">
            {t('views.name')}
          </label>
          <input
            id={nameId}
            autoFocus
            className={`${INPUT_CLASS} w-auto`}
            placeholder={t('views.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') setNaming(false);
            }}
          />
        </span>
      )}
    </div>
  );
}
