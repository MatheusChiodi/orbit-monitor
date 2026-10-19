import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { worstStatus } from '@/domains/monitor/status';
import type { AccessMode, Group, MonitorView } from '@/shared/api/types';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Button, INPUT_CLASS, LABEL_CLASS, Panel, StatusPill } from '@/shared/ui';
import { isValidSlug, slugify, toStatusPageItem, type StatusPageItem } from './statusPage';

export type StatusPageDraft = StatusPageItem;

export interface StatusPageBuilderProps {
  groups: readonly Group[];
  monitors: readonly MonitorView[];
  pages: readonly StatusPageDraft[];
  mode: AccessMode;
  onSave: (page: StatusPageDraft) => void;
}

/** FE-44: pick groups and preview a public/internal status page that shows group states only. */
export function StatusPageBuilder({ groups, monitors, pages, mode, onSave }: StatusPageBuilderProps) {
  const { t } = useTranslation();
  const ids = { title: useId(), slug: useId() };
  const [title, setTitle] = useState('');
  const [slugOverride, setSlugOverride] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<StatusPageDraft['visibility']>('internal');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const slug = slugOverride ?? slugify(title);
  const editable = mode === 'edit';

  function toggle(id: string) {
    setGroupIds((current) => (current.includes(id) ? current.filter((g) => g !== id) : [...current, id]));
    setError(false);
  }

  function save() {
    if (groupIds.length === 0 || !title.trim() || !isValidSlug(slug)) {
      setError(groupIds.length === 0);
      return;
    }
    onSave(toStatusPageItem({ title, slug, visibility, groupIds }));
  }

  return (
    <div className="flex flex-col gap-[1rem]">
      {pages.length === 0 ? (
        <p className="m-0 text-[0.85rem] text-muted">{t('statusPage.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-[0.3rem] p-0">
          {pages.map((p) => (
            <li key={p.slug} className="text-[0.9rem]">
              <SafeValue value={p.title} /> <span className="font-mono text-[0.75rem] text-dim">/{p.slug}</span>
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <div className="grid grid-cols-1 gap-[1rem] lg:grid-cols-2">
          <div className="flex flex-col gap-[0.6rem]">
            <div className={LABEL_CLASS}>
              <label htmlFor={ids.title}>{t('statusPage.title')}</label>
              <input id={ids.title} className={INPUT_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className={LABEL_CLASS}>
              <label htmlFor={ids.slug}>{t('statusPage.slug')}</label>
              <input id={ids.slug} className={`${INPUT_CLASS} font-mono`} value={slug} onChange={(e) => setSlugOverride(slugify(e.target.value))} />
            </div>
            <div role="radiogroup" className="flex gap-[0.8rem] text-[0.85rem]">
              {(['internal', 'public'] as const).map((v) => (
                <label key={v} className="flex items-center gap-[0.3rem]">
                  <input type="radio" name="status-page-visibility" checked={visibility === v} onChange={() => setVisibility(v)} />
                  {t(`statusPage.${v}`)}
                </label>
              ))}
            </div>
            {visibility === 'public' && <p className="m-0 text-[0.8rem] text-warn-text">{t('statusPage.publicWarning')}</p>}
            <fieldset className="m-0 flex flex-col gap-[0.3rem] border-0 p-0">
              {groups.map((g) => (
                <label key={g.id} className="flex items-center gap-[0.4rem] text-[0.85rem]">
                  <input type="checkbox" checked={groupIds.includes(g.id)} onChange={() => toggle(g.id)} />
                  {g.name}
                </label>
              ))}
            </fieldset>
            {error && (
              <p role="alert" className="m-0 text-[0.85rem] text-down-text">
                {t('statusPage.groupRequired')}
              </p>
            )}
            <div>
              <Button variant="primary" onClick={save}>
                {t('statusPage.save')}
              </Button>
            </div>
          </div>

          <Panel title={t('statusPage.preview')}>
            {title.trim() && (
              <h3 className="m-0 font-display text-[1.3rem] font-bold">
                <SafeValue value={title} />
              </h3>
            )}
            <ul className="m-0 mt-[0.5rem] flex list-none flex-col gap-[0.4rem] p-0">
              {groups
                .filter((g) => groupIds.includes(g.id))
                .map((g) => {
                  const state = worstStatus(monitors.filter((m) => m.groupId === g.id).map((m) => m.status));
                  return (
                    <li key={g.id} className="flex items-center justify-between gap-[0.6rem]">
                      <SafeValue value={g.name} surface="wall" />
                      <StatusPill status={state} />
                    </li>
                  );
                })}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}
