import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StatusPageBuilder, statusPageUrl, type StatusPageDraft } from '@/domains/workspace/StatusPageBuilder';
import { safeText } from '@/shared/privacy/redact';
import { Button, Dialog, PageHeader, useToast } from '@/shared/ui';
import { useConsole, useGroups, useMonitors } from '../../ConsoleContext';
import { useRouteAction } from '../../routes';
import { ScreenStatus } from '../ScreenStatus';
import { fromRecord, toRecord } from './statusPageRecords';

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** FE-44: `#/status-pages` — saved pages (open, copy, edit, delete) and the builder (orbit.status-pages.json). */
export function StatusPagesScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { source, demo, access } = useConsole();
  const queryClient = useQueryClient();
  const groups = useGroups();
  const monitors = useMonitors();
  const pages = useQuery({ queryKey: ['status-pages', demo], queryFn: source.listStatusPages });
  const [editing, setEditing] = useState<StatusPageDraft | null>(null);
  const [deleting, setDeleting] = useState<StatusPageDraft | null>(null);
  const [formKey, setFormKey] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const records = pages.data ?? [];
  const recordOf = (slug: string) => records.find((r) => r.slug === slug);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['status-pages', demo] });
  const resetForm = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
  };

  // "New status page" from the palette: a fresh form, focused once the pages have loaded.
  const [focusTitle, setFocusTitle] = useState(false);
  useRouteAction('new-status-page', () => {
    resetForm();
    setFocusTitle(true);
  });
  const loaded = pages.data !== undefined;
  useEffect(() => {
    if (!focusTitle || !loaded) return;
    titleRef.current?.focus();
    setFocusTitle(false);
  }, [focusTitle, loaded, formKey]);

  const open = (slug: string) => window.open(statusPageUrl(slug), '_blank', 'noopener,noreferrer');

  const save = useMutation({
    mutationFn: (draft: StatusPageDraft) => {
      const record = toRecord(draft, records);
      const original = editing ? recordOf(editing.slug) : undefined;
      return source.saveStatusPage(original ? { ...record, id: original.id } : record);
    },
    onSuccess: async (_, draft) => {
      toast({ title: t('ops.statusPages.saved'), tone: 'OK', action: { label: t('ops.statusPages.openPage'), onClick: () => open(draft.slug) } });
      resetForm();
      await refresh();
    },
    onError: (error) => toast({ title: reason(error), tone: 'DOWN' }),
  });

  const remove = useMutation({
    mutationFn: (draft: StatusPageDraft) => source.deleteStatusPage(recordOf(draft.slug)?.id ?? `sp-${draft.slug}`),
    onSuccess: async (_, draft) => {
      setDeleting(null);
      if (editing?.slug === draft.slug) resetForm();
      toast({ title: t('ops.statusPages.deleted'), tone: 'OK' });
      await refresh();
    },
    onError: (error) => toast({ title: reason(error), tone: 'DOWN' }),
  });

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t('ops.statusPages.copied'), tone: 'OK' });
    } catch {
      toast({ title: t('ops.statusPages.copyFailed', { url }) });
    }
  }

  return (
    <>
      <PageHeader title={t('screens.statusPages.title')} description={t('ops.statusPages.description')} />
      <ScreenStatus pending={pages.isPending} error={pages.error} />
      {pages.data && (
        <StatusPageBuilder
          key={`${editing?.slug ?? 'new'}-${formKey}`}
          groups={groups.data ?? []}
          monitors={monitors.data ?? []}
          pages={records.map(fromRecord)}
          mode={access.mode}
          editing={editing}
          titleRef={titleRef}
          onSave={(draft) => save.mutate(draft)}
          onEdit={(page) => {
            setEditing(page);
            requestAnimationFrame(() => titleRef.current?.focus());
          }}
          onCancelEdit={resetForm}
          onDelete={setDeleting}
          onCopy={(url) => void copy(url)}
        />
      )}
      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        size="sm"
        initialFocus={cancelRef}
        title={t('ops.statusPages.confirmTitle', { title: safeText(deleting?.title ?? '') })}
        description={deleting ? t('ops.statusPages.confirmBody', { url: statusPageUrl(deleting.slug) }) : undefined}
        footer={
          <>
            <Button ref={cancelRef} variant="secondary" onClick={() => setDeleting(null)}>
              {t('ops.statusPages.cancel')}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting)}>
              {t('ops.statusPages.confirm')}
            </Button>
          </>
        }
      />
    </>
  );
}
