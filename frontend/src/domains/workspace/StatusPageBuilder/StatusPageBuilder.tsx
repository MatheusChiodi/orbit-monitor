import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { worstStatus } from '@/domains/monitor/status';
import type { AccessMode, Group, MonitorView } from '@/shared/api/types';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Badge, Button, Checkbox, Field, IconExternal, Panel, SegmentedControl, StatusBadge, TextInput } from '@/shared/ui';
import { isValidSlug, slugify, statusPageUrl, toStatusPageItem, type StatusPageItem } from './statusPage';

export type StatusPageDraft = StatusPageItem;

export interface StatusPageBuilderProps {
  groups: readonly Group[];
  monitors: readonly MonitorView[];
  pages: readonly StatusPageDraft[];
  mode: AccessMode;
  onSave: (page: StatusPageDraft) => void;
}

const LINK_CLASS = 'inline-flex items-center gap-1 rounded-sm text-base text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent';

/** "Open page" link to a saved status page (new tab). */
export function StatusPageLink({ title, slug }: { title: string; slug: string }) {
  const { t } = useTranslation();
  return (
    <a href={statusPageUrl(slug)} target="_blank" rel="noopener noreferrer" aria-label={`${t('ops.statusPages.openPage')}: ${title}`} className={LINK_CLASS}>
      {t('ops.statusPages.openPage')}
      <IconExternal />
    </a>
  );
}

/** FE-44: pick groups and preview a public/internal status page that shows group states only. */
export function StatusPageBuilder({ groups, monitors, pages, mode, onSave }: StatusPageBuilderProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [slugOverride, setSlugOverride] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<StatusPageDraft['visibility']>('internal');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const slug = slugOverride ?? slugify(title);
  const editable = mode === 'edit';
  const allChecked = groups.length > 0 && groupIds.length === groups.length;
  const someChecked = groupIds.length > 0 && !allChecked;
  const chosen = groups.filter((g) => groupIds.includes(g.id));

  function toggle(id: string) {
    setGroupIds((current) => (current.includes(id) ? current.filter((g) => g !== id) : [...current, id]));
    setError(false);
  }

  function toggleAll() {
    setGroupIds(allChecked ? [] : groups.map((g) => g.id));
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
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="section-label m-0">{t('ops.statusPages.savedPages')}</h2>
        {pages.length === 0 ? (
          <p className="m-0 text-base text-muted">{t('statusPage.empty')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col rounded-md border border-line p-0">
            {pages.map((p) => (
              <li key={p.slug} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-3 py-2 last:border-b-0">
                <span className="font-medium text-text">
                  <SafeValue value={p.title} />
                </span>
                <Badge>{t(`statusPage.${p.visibility}`)}</Badge>
                <span className="min-w-0 truncate font-mono text-sm text-dim">{statusPageUrl(p.slug)}</span>
                <span className="ml-auto">
                  <StatusPageLink title={p.title} slug={p.slug} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editable && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Field label={t('statusPage.title')}>
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label={t('ops.statusPages.address')} hint={t('ops.statusPages.addressHint', { url: statusPageUrl(slug || '…') })}>
              <TextInput className="font-mono" value={slug} onChange={(e) => setSlugOverride(slugify(e.target.value))} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span aria-hidden="true" className="text-sm font-medium text-text">
                {t('ops.statusPages.visibility')}
              </span>
              <SegmentedControl
                label={t('ops.statusPages.visibility')}
                value={visibility}
                onChange={setVisibility}
                options={[
                  { value: 'internal', label: t('statusPage.internal') },
                  { value: 'public', label: t('statusPage.public') },
                ]}
              />
              <p className={`m-0 text-sm ${visibility === 'public' ? 'text-warn-text' : 'text-muted'}`}>
                {visibility === 'public' ? t('statusPage.publicWarning') : t('ops.statusPages.internalHelp')}
              </p>
            </div>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-1.5 p-0 text-sm font-medium text-text">{t('ops.statusPages.groups')}</legend>
              {groups.length === 0 ? (
                <p className="m-0 text-base text-muted">{t('ops.statusPages.noGroups')}</p>
              ) : (
                <>
                  <Checkbox
                    label={t('ops.statusPages.selectAll')}
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked;
                    }}
                    onChange={toggleAll}
                  />
                  <div className="flex flex-col gap-2 border-l border-line pl-4">
                    {groups.map((g) => (
                      <Checkbox key={g.id} label={g.name} checked={groupIds.includes(g.id)} onChange={() => toggle(g.id)} />
                    ))}
                  </div>
                </>
              )}
            </fieldset>
            {error && (
              <p role="alert" className="m-0 text-base text-down-text">
                {t('statusPage.groupRequired')}
              </p>
            )}
            <div>
              <Button variant="primary" onClick={save}>
                {t('statusPage.save')}
              </Button>
            </div>
          </div>

          <Panel title={t('statusPage.preview')} surface="solid">
            <h3 className={`display-wide m-0 text-lg ${title.trim() ? 'text-text' : 'text-dim'}`}>
              {title.trim() ? <SafeValue value={title} /> : t('ops.statusPages.untitled')}
            </h3>
            {chosen.length === 0 ? (
              <p className="m-0 mt-3 text-base text-muted">{t('ops.statusPages.previewEmpty')}</p>
            ) : (
              <ul className="m-0 mt-3 flex list-none flex-col p-0">
                {chosen.map((g) => {
                  const state = worstStatus(monitors.filter((m) => m.groupId === g.id).map((m) => m.status));
                  return (
                    <li key={g.id} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
                      <SafeValue value={g.name} surface="wall" />
                      <StatusBadge status={state} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
