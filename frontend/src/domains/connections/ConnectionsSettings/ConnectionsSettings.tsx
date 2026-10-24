import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Connection } from '@/shared/api/types';
import { Button, Card, Dialog, EmptyState, IconPlus, Menu, Table, useToast, type TableColumn } from '@/shared/ui';
import { ConnectionDialog } from '../ConnectionDialog';
import { ConnectionTestStatus, useConnectionTests } from '../ConnectionTestStatus';
import { connectionsKey, type ConnectionsSource } from '../model';

export interface ConnectionsSettingsProps {
  /** The console source (live API or demo). */
  source: ConnectionsSource;
  /** Demo flag of the console: live and demo connections never share a cache entry. */
  demo: boolean;
  /** False away from the machine that runs Orbit (view-only access). */
  editable?: boolean;
}

type Editing = { connection?: Connection; rotate?: boolean } | null;

/** Settings › Connections: list, add, edit, test, change password and delete database connections (the host renders the heading). */
export function ConnectionsSettings({ source, demo, editable = true }: ConnectionsSettingsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = connectionsKey(demo);
  const list = useQuery({ queryKey: key, queryFn: source.listConnections });
  const { tests, run } = useConnectionTests(source.testConnection);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Connection | null>(null);
  const connections = list.data ?? [];

  const remove = useMutation({
    mutationFn: (id: string) => source.deleteConnection(id),
    onSuccess: async () => {
      setDeleting(null);
      toast({ title: t('monitorForm.connections.deleted') });
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });

  async function onSaved(connection: Connection) {
    const isNew = !editing?.connection;
    setEditing(null);
    toast({ title: t('monitorForm.connections.saved'), tone: 'OK' });
    await queryClient.invalidateQueries({ queryKey: key });
    if (isNew || editing?.rotate) void run(connection.id);
  }

  const add = editable ? (
    <Button variant="primary" onClick={() => setEditing({})}>
      <IconPlus />
      {t('monitorForm.connections.add')}
    </Button>
  ) : null;

  const columns: TableColumn<Connection>[] = [
    { key: 'name', header: t('monitorForm.connections.columns.name'), cell: (c) => <span className="font-medium text-text">{c.name}</span> },
    { key: 'kind', header: t('monitorForm.connections.columns.database'), cell: (c) => t(`monitorForm.connections.kinds.${c.kind}`) },
    {
      key: 'address',
      header: t('monitorForm.connections.columns.address'),
      mono: true,
      hideOnMobile: true,
      cell: (c) => <span className="block max-w-xs truncate" title={c.jdbcUrl}>{c.jdbcUrl}</span>,
    },
    { key: 'user', header: t('monitorForm.connections.columns.user'), mono: true, hideOnMobile: true, cell: (c) => c.username ?? '' },
    { key: 'status', header: t('monitorForm.connections.columns.status'), cell: (c) => <ConnectionTestStatus state={tests[c.id]} className="max-w-xs" /> },
  ];
  if (editable) {
    columns.push({
      key: 'actions',
      header: '',
      align: 'end',
      cell: (c) => (
        <Menu
          label={t('monitorForm.connections.actions', { name: c.name })}
          align="end"
          items={[
            { id: 'test', label: t('monitorForm.connections.test'), onSelect: () => void run(c.id), disabled: tests[c.id]?.phase === 'testing' },
            { id: 'edit', label: t('monitorForm.connections.edit'), onSelect: () => setEditing({ connection: c }) },
            { id: 'rotate', label: t('monitorForm.connections.rotate'), onSelect: () => setEditing({ connection: c, rotate: true }) },
            { id: 'delete', label: t('monitorForm.connections.delete'), danger: true, onSelect: () => setDeleting(c) },
          ]}
        />
      ),
    });
  }

  return (
    // The Settings section renders the "Connections" heading; the card carries the description and the action.
    <Card description={t('monitorForm.connections.description')} actions={connections.length > 0 ? add : null}>
      {!editable && <p className="m-0 text-sm text-muted">{t('monitorForm.connections.readOnly')}</p>}
      {list.isError ? (
        <p role="alert" className="m-0 text-sm text-down-text">
          {t('monitorForm.connections.loadFailed')}
        </p>
      ) : list.isPending ? null : connections.length === 0 ? (
        <EmptyState title={t('monitorForm.connections.emptyTitle')} action={add} headingLevel={3}>
          {t('monitorForm.connections.emptyBody')}
        </EmptyState>
      ) : (
        <Table caption={t('monitorForm.connections.caption')} columns={columns} rows={connections} getRowKey={(c) => c.id} />
      )}
      <ConnectionDialog
        open={editing !== null}
        connection={editing?.connection}
        rotate={editing?.rotate}
        takenIds={connections.map((c) => c.id)}
        onClose={() => setEditing(null)}
        onSave={source.saveConnection}
        onSaved={(c) => void onSaved(c)}
      />
      <Dialog
        open={deleting !== null}
        size="sm"
        onClose={() => setDeleting(null)}
        title={t('monitorForm.connections.deleteTitle', { name: deleting?.name ?? '' })}
        description={t('monitorForm.connections.deleteBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t('form.cancel')}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>
              {t('monitorForm.connections.deleteConfirm')}
            </Button>
          </>
        }
      />
    </Card>
  );
}

export default ConnectionsSettings;
