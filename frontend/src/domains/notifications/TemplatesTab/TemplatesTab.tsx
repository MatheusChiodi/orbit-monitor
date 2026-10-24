import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Dialog, Menu, Table, useToast, type TableColumn } from '@/shared/ui';
import type { MessageLocale, Template } from '../api/notificationsApi';
import { LoadError } from '../LoadError';
import { keys, useNotifications } from '../model/queries';
import { TemplateEditDialog, TemplatePreviewDialog, templateName } from '../TemplateDialogs';

/** Message templates: what each event says, per language; preview and reset to default. */
export function TemplatesTab() {
  const { t, i18n } = useTranslation();
  const { api, editable } = useNotifications();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: keys.templates, queryFn: api.listTemplates });
  const [editing, setEditing] = useState<Template | null>(null);
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [resetting, setResetting] = useState<Template | null>(null);
  const locale: MessageLocale = i18n.language === 'pt-BR' ? 'pt-BR' : 'en';
  const templates = list.data?.templates ?? [];

  const reset = useMutation({
    mutationFn: (id: string) => api.resetTemplate(id),
    onSuccess: async () => {
      setResetting(null);
      toast({ title: t('notificationSettings.templates.resetDone') });
      await queryClient.invalidateQueries({ queryKey: keys.templates });
    },
  });

  const columns: TableColumn<Template>[] = [
    { key: 'event', header: t('notificationSettings.templates.columns.event'), cell: (tpl) => <span className="font-medium text-text">{templateName(t, tpl.id)}</span> },
    {
      key: 'subject',
      header: t('notificationSettings.templates.columns.subject'),
      mono: true,
      hideOnMobile: true,
      cell: (tpl) => <span className="block max-w-sm truncate">{tpl.title[locale] ?? tpl.title.en ?? ''}</span>,
    },
    {
      key: 'state',
      header: t('notificationSettings.templates.columns.state'),
      cell: (tpl) => (tpl.custom ? <Badge tone="INFO">{t('notificationSettings.templates.customized')}</Badge> : <Badge>{t('notificationSettings.templates.default')}</Badge>),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      cell: (tpl) => {
        const name = templateName(t, tpl.id);
        const items = [{ id: 'preview', label: t('notificationSettings.templates.preview'), onSelect: () => setPreviewing(tpl) }];
        if (editable) {
          items.unshift({ id: 'edit', label: t('notificationSettings.templates.edit'), onSelect: () => setEditing(tpl) });
          if (tpl.custom) items.push({ id: 'reset', label: t('notificationSettings.templates.reset'), onSelect: () => setResetting(tpl) });
        }
        return <Menu label={t('notificationSettings.templates.actions', { name })} align="end" items={items} />;
      },
    },
  ];

  return (
    <Card title={t('notificationSettings.templates.title')} description={t('notificationSettings.templates.description')}>
      {list.isError ? (
        <LoadError onRetry={() => void list.refetch()} />
      ) : list.isPending ? null : (
        <Table caption={t('notificationSettings.templates.caption')} columns={columns} rows={templates} getRowKey={(tpl) => tpl.id} />
      )}
      <TemplateEditDialog
        template={editing}
        variables={list.data?.variables ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          toast({ title: t('notificationSettings.templates.saved'), tone: 'OK' });
          void queryClient.invalidateQueries({ queryKey: keys.templates });
        }}
      />
      <TemplatePreviewDialog template={previewing} onClose={() => setPreviewing(null)} />
      <Dialog
        open={resetting !== null}
        size="sm"
        onClose={() => setResetting(null)}
        title={t('notificationSettings.templates.resetTitle', { name: resetting ? templateName(t, resetting.id) : '' })}
        description={t('notificationSettings.templates.resetBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetting(null)}>
              {t('notificationSettings.cancel')}
            </Button>
            <Button variant="danger" loading={reset.isPending} onClick={() => resetting && reset.mutate(resetting.id)}>
              {t('notificationSettings.templates.reset')}
            </Button>
          </>
        }
      />
    </Card>
  );
}
