import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BlockSettings, type BlockOptions } from '@/domains/workspace/BlockSettings';
import { LayoutEditor } from '@/domains/workspace/LayoutEditor';
import { LayoutSettings, type LayoutSettingsValue } from '@/domains/workspace/LayoutSettings';
import { templateById } from '@/domains/workspace/layout/templates';
import type { LayoutsApi, WallLayout } from '@/domains/workspace/layout/layoutsApi';
import { themeStyle } from '@/domains/settings/appearance/WallPreview';
import type { Group, MonitorView } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { findTheme, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui';

export const LAYOUTS_HASH = '#/layouts';
export const LAYOUTS_QUERY_KEY = ['config', 'layouts'] as const;

export interface LayoutsPageProps {
  api: Pick<LayoutsApi, 'list' | 'save'>;
  editable: boolean;
  monitors: readonly MonitorView[];
  groups: readonly Group[];
}

function selectedFromHash(): string | null {
  const match = /^#\/layouts\/(.+)$/.exec(window.location.hash);
  return match ? decodeURIComponent(match[1]!) : null;
}

function freeSlug(layouts: readonly WallLayout[]): string {
  const taken = new Set(layouts.map((l) => l.slug));
  let n = layouts.length + 1;
  while (taken.has(`layout-${n}`)) n += 1;
  return `layout-${n}`;
}

const settingsOf = (l: WallLayout): LayoutSettingsValue => ({ name: l.name, slug: l.slug, themeId: l.themeId, animationLevel: l.animationLevel, playlist: l.playlist });

/** FE-11 console route (`#/layouts`, `#/layouts/<id>`): saved wall layouts, their settings and the grid editor. */
export function LayoutsPage({ api, editable, monitors, groups }: LayoutsPageProps) {
  const { t } = useTranslation();
  const { themes } = useTheme();
  const queryClient = useQueryClient();
  const layouts = useQuery({ queryKey: LAYOUTS_QUERY_KEY, queryFn: api.list });
  const [selectedId, setSelectedId] = useState<string | null>(selectedFromHash);
  const [draft, setDraft] = useState<WallLayout | null>(null);
  const [settings, setSettings] = useState<LayoutSettingsValue | null>(null);
  const [blockOptions, setBlockOptions] = useState<Record<string, BlockOptions>>({});
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const all = useMemo(() => [...(layouts.data ?? []), ...(draft ? [draft] : [])], [layouts.data, draft]);
  const selected = all.find((l) => l.id === selectedId) ?? null;
  const current = selected ? { ...selected, ...(settings ?? settingsOf(selected)) } : null;

  function select(layout: WallLayout) {
    setSelectedId(layout.id);
    setSettings(settingsOf(layout));
    setBlockOptions({});
    setNotice(null);
    window.location.hash = `${LAYOUTS_HASH}/${encodeURIComponent(layout.id)}`;
  }

  function create() {
    const slug = freeSlug(layouts.data ?? []);
    const layout: WallLayout = { id: `layout-${Date.now().toString(36)}`, slug, name: slug, blocks: [...(templateById('noc')?.blocks ?? [])] };
    setDraft(layout);
    select(layout);
  }

  const save = useMutation({
    mutationFn: (layout: WallLayout) => api.save(layout),
    onSuccess: async (_, layout) => {
      setNotice({ ok: true, text: t('layout.page.saved', { name: layout.name }) });
      if (draft?.id === layout.id) setDraft(null);
      await queryClient.invalidateQueries({ queryKey: LAYOUTS_QUERY_KEY });
    },
    onError: (error: Error) => setNotice({ ok: false, text: t('layout.page.saveError', { message: error.message }) }),
  });

  const themeChoices = themes.map((theme) => ({ id: theme.id, name: theme.name }));
  const previewTheme = current?.themeId ? findTheme(current.themeId, themes) : null;

  return (
    <div className="grid gap-[1rem] lg:grid-cols-[14rem_1fr]">
      <nav aria-label={t('layout.page.list')} className="flex flex-col gap-[0.4rem]">
        {layouts.isError && <p className="m-0 text-down-text">{t('layout.page.loadError')}</p>}
        {layouts.data?.length === 0 && !draft && <p className="m-0 text-[0.85rem] text-muted">{t('layout.page.empty')}</p>}
        {all.map((layout) => (
          <Button key={layout.id} variant="ghost" aria-current={layout.id === selectedId ? 'page' : undefined} onClick={() => select(layout)}>
            {safeText(layout.name)}
          </Button>
        ))}
        {editable && (
          <Button variant="primary" onClick={create}>
            {t('layout.page.new')}
          </Button>
        )}
      </nav>

      {current && selected && (
        <div className="flex min-w-0 flex-col gap-[0.8rem]">
          {notice && (
            <p role="status" className={`m-0 text-[0.85rem] ${notice.ok ? 'text-ok-text' : 'text-down-text'}`}>
              {notice.text}
            </p>
          )}
          <a href={`/wall/${encodeURIComponent(selected.slug)}`} className="self-start text-info hover:underline">
            {t('layout.page.openOnWall')}
          </a>
          <LayoutSettings
            value={settings ?? settingsOf(selected)}
            onChange={setSettings}
            themes={themeChoices}
            slugs={(layouts.data ?? []).map((l) => l.slug)}
            editable={editable}
          />
          <BlockSettings blocks={selected.blocks} value={blockOptions} onChange={setBlockOptions} monitors={monitors} groups={groups} editable={editable} />
          <div data-theme-preview={previewTheme?.id} style={previewTheme ? themeStyle(previewTheme) : undefined} className="rounded-[0.9rem] text-text">
            <LayoutEditor
              key={selected.id}
              layout={current}
              editable={editable}
              onSave={(layout) =>
                save.mutate({ ...layout, ...(settings ?? {}), blocks: layout.blocks.map((b) => ({ ...b, ...blockOptions[b.id] })) })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
