import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { SavedQuery } from '@/shared/api/consoleTypes';
import type { Connection } from '@/shared/api/types';
import { Button, Card, Dialog, EmptyState, Field, IconPlus, Menu, Select, Table, TextArea, TextInput, useToast, type TableColumn } from '@/shared/ui';
import { newId } from '../model';

/** What the saved-queries tab needs from the console source. */
export interface SavedQueriesSource {
  /** `''` lists every saved query. */
  listSavedQueries: (connectionId: string) => Promise<SavedQuery[]>;
  saveSavedQuery: (query: SavedQuery) => Promise<SavedQuery>;
  deleteSavedQuery: (id: string) => Promise<void>;
}

export interface SavedQueriesProps {
  source: SavedQueriesSource;
  connections: readonly Connection[];
  demo: boolean;
  editable?: boolean;
}

export function savedQueriesKey(demo: boolean) {
  return ['saved-queries', demo] as const;
}

type Editing = { query?: SavedQuery } | null;

/** Settings › Connections › Saved queries: the SELECTs a SQL monitor can start from (orbit.query-catalog.json). */
export function SavedQueries({ source, connections, demo, editable = true }: SavedQueriesProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = savedQueriesKey(demo);
  const list = useQuery({ queryKey: key, queryFn: () => source.listSavedQueries('') });
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<SavedQuery | null>(null);
  const queries = list.data ?? [];
  const connectionName = (id: string) => connections.find((c) => c.id === id)?.name ?? id;

  const remove = useMutation({
    mutationFn: (id: string) => source.deleteSavedQuery(id),
    onSuccess: async () => {
      setDeleting(null);
      toast({ title: t('monitorForm.queries.deleted') });
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const add =
    editable && connections.length > 0 ? (
      <Button variant="secondary" onClick={() => setEditing({})}>
        <IconPlus />
        {t('monitorForm.queries.add')}
      </Button>
    ) : null;

  const columns: TableColumn<SavedQuery>[] = [
    { key: 'name', header: t('monitorForm.queries.name'), cell: (q) => <span className="font-medium text-text">{q.name}</span> },
    { key: 'connection', header: t('monitorForm.queries.connection'), cell: (q) => connectionName(q.connectionId) },
    {
      key: 'sql',
      header: t('monitorForm.queries.sql'),
      mono: true,
      hideOnMobile: true,
      cell: (q) => (
        <span className="block max-w-sm truncate" title={q.sql}>
          {q.sql}
        </span>
      ),
    },
  ];
  if (editable) {
    columns.push({
      key: 'actions',
      header: '',
      align: 'end',
      cell: (q) => (
        <Menu
          label={t('monitorForm.queries.actions', { name: q.name })}
          align="end"
          items={[
            { id: 'edit', label: t('monitorForm.connections.edit'), onSelect: () => setEditing({ query: q }) },
            { id: 'delete', label: t('monitorForm.connections.delete'), danger: true, onSelect: () => setDeleting(q) },
          ]}
        />
      ),
    });
  }

  return (
    <Card description={t('monitorForm.queries.description')} actions={queries.length > 0 ? add : null}>
      {list.isError ? (
        <p role="alert" className="m-0 text-sm text-down-text">
          {t('monitorForm.queries.loadFailed')}
        </p>
      ) : list.isPending ? null : queries.length === 0 ? (
        <EmptyState title={t('monitorForm.queries.emptyTitle')} action={add} headingLevel={3}>
          {connections.length > 0 ? t('monitorForm.queries.emptyBody') : t('monitorForm.queries.needsConnection')}
        </EmptyState>
      ) : (
        <Table caption={t('monitorForm.queries.caption')} columns={columns} rows={queries} getRowKey={(q) => q.id} />
      )}
      {editing && (
        <SavedQueryDialog
          query={editing.query}
          connections={connections}
          takenIds={queries.map((q) => q.id)}
          onClose={() => setEditing(null)}
          onSave={async (query) => {
            await source.saveSavedQuery(query);
            setEditing(null);
            toast({ title: t('monitorForm.queries.saved'), tone: 'OK' });
            await queryClient.invalidateQueries({ queryKey: key });
          }}
        />
      )}
      <Dialog
        open={deleting !== null}
        size="sm"
        onClose={() => setDeleting(null)}
        title={t('monitorForm.queries.deleteTitle', { name: deleting?.name ?? '' })}
        description={t('monitorForm.queries.deleteBody')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t('form.cancel')}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>
              {t('monitorForm.queries.deleteConfirm')}
            </Button>
          </>
        }
      />
    </Card>
  );
}

export interface SavedQueryDialogProps {
  query?: SavedQuery;
  /** Prefill for "Save to catalog" from the SQL form. */
  initial?: Partial<SavedQuery>;
  connections: readonly Connection[];
  takenIds: readonly string[];
  onClose: () => void;
  onSave: (query: SavedQuery) => Promise<void>;
}

/** Add or edit one saved query (name, connection, SELECT, optional description). */
export function SavedQueryDialog({ query, initial, connections, takenIds, onClose, onSave }: SavedQueryDialogProps) {
  const { t } = useTranslation();
  const start = query ?? initial ?? {};
  const [name, setName] = useState(start.name ?? '');
  const [connectionId, setConnectionId] = useState(start.connectionId ?? connections[0]?.id ?? '');
  const [sql, setSql] = useState(start.sql ?? '');
  const [description, setDescription] = useState(start.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formId = 'saved-query-form';

  async function submit() {
    if (!name.trim() || !connectionId || !sql.trim()) return setError(t('monitorForm.queries.required'));
    setSaving(true);
    try {
      await onSave({
        id: query?.id ?? newId(name, takenIds),
        name: name.trim(),
        connectionId,
        sql: sql.trim(),
        description: description.trim() || null,
      });
    } catch (e) {
      setError(t('monitorForm.queries.saveFailed', { error: e instanceof Error ? e.message : '' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t(query ? 'monitorForm.queries.editTitle' : 'monitorForm.queries.addTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={saving}>
            {t('monitorForm.queries.save')}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label={t('monitorForm.queries.name')}>
          <TextInput value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t('monitorForm.queries.connection')}>
          <Select value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('monitorForm.queries.sql')}>
          <TextArea mono rows={5} spellCheck={false} value={sql} onChange={(e) => setSql(e.target.value)} />
        </Field>
        <Field label={t('monitorForm.queries.descriptionLabel')}>
          <TextInput value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {error && (
          <p role="alert" className="m-0 text-sm text-down-text">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
