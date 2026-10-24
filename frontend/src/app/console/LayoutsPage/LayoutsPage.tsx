import { useEffect, useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BlockSettings, type BlockOptions } from '@/domains/workspace/BlockSettings';
import { LayoutEditor } from '@/domains/workspace/LayoutEditor';
import { LayoutSettings, type LayoutSettingsValue } from '@/domains/workspace/LayoutSettings';
import type { LayoutBlock } from '@/domains/workspace/layout/grid';
import { templateById, type LayoutTemplate } from '@/domains/workspace/layout/templates';
import type { LayoutsApi, WallLayout } from '@/domains/workspace/layout/layoutsApi';
import { themeStyle } from '@/domains/settings/appearance/WallPreview';
import { settingsHref } from '@/app/settings/sections';
import type { Group, MonitorView } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { findTheme, useTheme } from '@/shared/theme';
import { Badge, Button, Card, Dialog, EmptyState, IconCopy, IconExternal, IconPlus, IconTrash, IconWall, Menu, Select, StickyActionBar, useToast, type MenuItem } from '@/shared/ui';
import { CreateLayoutDialog } from './CreateLayoutDialog';
import { uniqueSlug } from './slug';

export const LAYOUTS_QUERY_KEY = ['config', 'layouts'] as const;

export interface LayoutsPageProps {
  /** `remove` is optional: without it the layout cannot be deleted from here. */
  api: Pick<LayoutsApi, 'list' | 'save'> & Partial<Pick<LayoutsApi, 'remove'>>;
  editable: boolean;
  /** Layout id from the route (`#/settings/wall-layouts/<id>`). */
  selectedId: string | null;
  monitors: readonly MonitorView[];
  groups: readonly Group[];
}

const settingsOf = (l: WallLayout): LayoutSettingsValue => ({ name: l.name, slug: l.slug, themeId: l.themeId, animationLevel: l.animationLevel, playlist: l.playlist });

function open(id: string) {
  window.location.hash = settingsHref('wall-layouts', id);
}

/** FE-11 in Settings › Wall layouts: pick or create a layout, its settings, its blocks, then save from the sticky bar. */
export function LayoutsPage({ api, editable, selectedId: routeId, monitors, groups }: LayoutsPageProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const pickerId = useId();
  const { themes } = useTheme();
  const queryClient = useQueryClient();
  const layouts = useQuery({ queryKey: LAYOUTS_QUERY_KEY, queryFn: api.list });
  const [draft, setDraft] = useState<WallLayout | null>(null);
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState<LayoutSettingsValue | null>(null);
  const [blocks, setBlocks] = useState<LayoutBlock[] | null>(null);
  const [blockOptions, setBlockOptions] = useState<Record<string, BlockOptions>>({});
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const saved = layouts.data ?? [];
  const all = useMemo(() => [...saved, ...(draft ? [draft] : [])], [saved, draft]);
  // A new layout stays a local draft (not in the URL, which would remount the screen) until it is saved;
  // without an id in the URL the first layout opens.
  const selectedId = draft ? draft.id : (routeId ?? saved[0]?.id ?? null);
  const selected = all.find((l) => l.id === selectedId) ?? null;
  const current = selected ? { ...selected, ...(settings ?? settingsOf(selected)), blocks: blocks ?? selected.blocks } : null;
  const dirty = Boolean(draft && draft.id === selectedId) || settings !== null || blocks !== null || Object.keys(blockOptions).length > 0;

  useEffect(() => {
    setSettings(null);
    setBlocks(null);
    setBlockOptions({});
    setError(null);
    setSelectedBlock(selected?.blocks[0]?.id ?? null);
    // Only a change of layout resets the unsaved edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function choose(id: string) {
    if (draft && id === draft.id) return;
    setDraft(null);
    open(id);
  }

  function create(name: string, templateId: LayoutTemplate['id']) {
    const layout: WallLayout = {
      id: `layout-${Date.now().toString(36)}`,
      slug: uniqueSlug(name, saved.map((l) => l.slug)),
      name,
      blocks: [...(templateById(templateId)?.blocks ?? [])],
    };
    setDraft(layout);
  }

  function duplicate(source: WallLayout) {
    const name = t('settingsHub.layouts.copyOf', { name: source.name });
    setDraft({
      ...source,
      ...(settings ?? {}),
      id: `layout-${Date.now().toString(36)}`,
      name,
      slug: uniqueSlug(name, saved.map((l) => l.slug)),
      blocks: (blocks ?? source.blocks).map((b) => ({ ...b, ...blockOptions[b.id] })),
    });
  }

  async function copyAddress(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t('settingsHub.layouts.addressCopied'), description: url, tone: 'OK' });
    } catch {
      toast({ title: t('settingsHub.layouts.copyFailed'), description: url, tone: 'WARN' });
    }
  }

  const remove = useMutation({
    mutationFn: (layout: WallLayout) => (api.remove ? api.remove(layout.id) : Promise.resolve()),
    onSuccess: async (_, layout) => {
      setDeleting(false);
      toast({ title: t('settingsHub.layouts.deleted', { name: safeText(layout.name) }), tone: 'OK' });
      await queryClient.invalidateQueries({ queryKey: LAYOUTS_QUERY_KEY });
      window.location.hash = settingsHref('wall-layouts');
    },
    onError: (e: Error) => {
      setDeleting(false);
      setError(t('settingsHub.layouts.deleteError', { message: e.message }));
    },
  });

  const save = useMutation({
    mutationFn: (layout: WallLayout) => api.save(layout),
    onSuccess: async (_, layout) => {
      toast({ title: t('settingsHub.layouts.saved', { name: safeText(layout.name) }), tone: 'OK' });
      await queryClient.invalidateQueries({ queryKey: LAYOUTS_QUERY_KEY });
      if (draft?.id === layout.id) {
        setDraft(null);
        open(layout.id);
      }
      setSettings(null);
      setBlocks(null);
      setBlockOptions({});
    },
    onError: (e: Error) => setError(t('layout.page.saveError', { message: e.message })),
  });

  const onSave = () => {
    if (!current) return;
    save.mutate({ ...current, blocks: current.blocks.map((b) => ({ ...b, ...blockOptions[b.id] })) });
  };

  const themeChoices = themes.map((theme) => ({ id: theme.id, name: theme.name }));
  const previewTheme = current?.themeId ? findTheme(current.themeId, themes) : null;
  const wallUrl = current ? `/wall/${encodeURIComponent(current.slug)}` : '';
  const isDraft = Boolean(draft && selected && draft.id === selected.id);
  const actions: MenuItem[] = selected
    ? [
        { id: 'copy-url', label: t('settingsHub.layouts.copyAddress'), icon: IconCopy, disabled: isDraft, onSelect: () => void copyAddress(`${window.location.origin}${wallUrl}`) },
        ...(editable ? [{ id: 'duplicate', label: t('settingsHub.layouts.duplicate'), icon: IconCopy, disabled: isDraft, onSelect: () => duplicate(selected) }] : []),
        ...(editable && api.remove ? [{ id: 'delete', label: t('settingsHub.layouts.delete'), icon: IconTrash, danger: true, disabled: isDraft, onSelect: () => setDeleting(true) }] : []),
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 max-w-2xl text-sm text-muted">{t('settingsHub.layouts.intro')}</p>
      {layouts.isError && (
        <p role="alert" className="m-0 text-sm text-down-text">
          {t('layout.page.loadError')}
        </p>
      )}

      {all.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex w-full max-w-sm flex-col gap-1.5">
            <label htmlFor={pickerId} className="text-sm font-medium text-muted">
              {t('settingsHub.layouts.list')}
            </label>
            <Select id={pickerId} value={selectedId ?? ''} onChange={(e) => choose(e.target.value)}>
              {all.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {safeText(layout.name)}
                </option>
              ))}
            </Select>
          </div>
          {editable && (
            <Button onClick={() => setCreating(true)}>
              <IconPlus />
              {t('settingsHub.layouts.new')}
            </Button>
          )}
        </div>
      )}

      {layouts.isSuccess && all.length === 0 && (
        <EmptyState
          icon={IconWall}
          title={t('settingsHub.nav.wall-layouts')}
          action={
            editable ? (
              <Button variant="primary" onClick={() => setCreating(true)}>
                <IconPlus />
                {t('settingsHub.layouts.new')}
              </Button>
            ) : undefined
          }
        >
          {t('settingsHub.layouts.empty')}
        </EmptyState>
      )}

      {current && selected && (
        <>
          <Card
            title={
              <span className="flex flex-wrap items-center gap-2">
                {safeText(current.name)}
                {draft?.id === selected.id && <Badge>{t('settingsHub.layouts.draft')}</Badge>}
              </span>
            }
            description={<span className="font-mono">{t('settingsHub.layouts.address', { url: wallUrl })}</span>}
            actions={
              <span className="flex items-center gap-1">
                {!isDraft && (
                  <a href={wallUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2 text-sm text-accent hover:underline">
                    {t('settingsHub.layouts.openOnWall')}
                    <IconExternal />
                  </a>
                )}
                <Menu label={t('settingsHub.layouts.actions', { name: safeText(current.name) })} items={actions} />
              </span>
            }
          >
            <LayoutSettings
              value={settings ?? settingsOf(selected)}
              onChange={setSettings}
              themes={themeChoices}
              layouts={saved.filter((l) => l.id !== selected.id)}
              editable={editable}
            />
          </Card>

          <Card title={t('settingsHub.layouts.blocks')}>
            <div data-theme-preview={previewTheme?.id} style={previewTheme ? themeStyle(previewTheme) : undefined} className="text-text">
              <LayoutEditor
                key={selected.id}
                layout={selected}
                editable={editable}
                monitors={monitors}
                onChange={setBlocks}
                selectedBlockId={selectedBlock}
                onSelectBlock={setSelectedBlock}
              />
            </div>
            <div className="border-t border-line pt-3">
              <h3 className="section-label m-0 mb-3">{t('settingsHub.layouts.blockOptions')}</h3>
              <BlockSettings
                blocks={current.blocks}
                value={blockOptions}
                onChange={setBlockOptions}
                monitors={monitors}
                groups={groups}
                editable={editable}
                selected={selectedBlock}
                onSelect={setSelectedBlock}
              />
            </div>
          </Card>

          {editable && (
            <StickyActionBar status={error ? <span className="text-down-text">{error}</span> : dirty ? t('settingsHub.layouts.unsaved') : undefined}>
              <Button variant="primary" loading={save.isPending} disabled={!dirty} onClick={onSave}>
                {t('settingsHub.layouts.saveLayout')}
              </Button>
            </StickyActionBar>
          )}
        </>
      )}

      {selected && (
        <Dialog
          open={deleting}
          onClose={() => setDeleting(false)}
          size="sm"
          title={t('settingsHub.layouts.deleteTitle', { name: safeText(selected.name) })}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleting(false)}>
                {t('settingsHub.layouts.cancel')}
              </Button>
              <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(selected)}>
                {t('settingsHub.layouts.deleteConfirm')}
              </Button>
            </>
          }
        >
          <p className="m-0 text-base text-muted">{t('settingsHub.layouts.deleteBody', { url: wallUrl })}</p>
        </Dialog>
      )}

      <CreateLayoutDialog open={creating} onClose={() => setCreating(false)} onCreate={create} />
    </div>
  );
}
