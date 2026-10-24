import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { safeText } from '@/shared/privacy/redact';
import { Badge, Button, Card, Dialog, IconEdit, IconPlus, IconTrash, Menu, Table, useToast, type TableColumn } from '@/shared/ui';
import { VariableDialog } from './VariableDialog';
import type { Variable, VariableInput, VariablesApi } from './variablesApi';

export interface VariablesCardProps {
  api: VariablesApi;
  /** Demo and live variables never share a cache entry. */
  demo: boolean;
  editable: boolean;
}

type Editing = { variable: Variable | null } | null;

/** Settings › Advanced: workspace variables (`orbit.variables.json`) used as `${var:name}` / `${vault:name}`. */
export function VariablesCard({ api, demo, editable }: VariablesCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = ['variables', demo] as const;
  const variables = useQuery({ queryKey: key, queryFn: api.list });
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Variable | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: VariableInput }) => api.save(id, input),
    onSuccess: async (saved) => {
      setEditing(null);
      setError(null);
      toast({ title: t('settingsHub.variables.saved', { name: saved.name }), tone: 'OK' });
      await queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => setError(e.message),
  });
  const remove = useMutation({
    mutationFn: (variable: Variable) => api.remove(variable.id),
    onSuccess: async (_, variable) => {
      setDeleting(null);
      toast({ title: t('settingsHub.variables.deleted', { name: variable.name }), tone: 'OK' });
      await queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => {
      setDeleting(null);
      setError(e.message);
    },
  });

  const columns: TableColumn<Variable>[] = [
    { key: 'name', header: t('settingsHub.variables.columns.name'), mono: true, cell: (v) => v.name },
    { key: 'kind', header: t('settingsHub.variables.columns.kind'), cell: (v) => <Badge>{t(`settingsHub.variables.kinds.${v.kind}`)}</Badge> },
    { key: 'value', header: t('settingsHub.variables.columns.value'), mono: true, cell: (v) => <SafeValue value={v.value} field={v.name} /> },
    { key: 'description', header: t('settingsHub.variables.columns.description'), hideOnMobile: true, cell: (v) => safeText(v.description) },
    ...(editable
      ? [
          {
            key: 'actions',
            header: '',
            align: 'end' as const,
            cell: (v: Variable) => (
              <Menu
                size="sm"
                label={t('settingsHub.variables.actions', { name: v.name })}
                items={[
                  { id: 'edit', label: t('settingsHub.variables.edit'), icon: IconEdit, onSelect: () => setEditing({ variable: v }) },
                  { id: 'delete', label: t('settingsHub.variables.delete'), icon: IconTrash, danger: true, onSelect: () => setDeleting(v) },
                ]}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <Card
      title={t('settingsHub.variables.title')}
      description={t('settingsHub.variables.hint', { example: '${var:region}' })}
      actions={
        editable ? (
          <Button size="sm" onClick={() => setEditing({ variable: null })}>
            <IconPlus />
            {t('settingsHub.variables.add')}
          </Button>
        ) : undefined
      }
    >
      {variables.isError && (
        <p role="alert" className="m-0 text-sm text-down-text">
          {t('settingsHub.variables.loadError')}
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 text-sm text-down-text">
          {error}
        </p>
      )}
      {variables.isSuccess && (
        <Table
          caption={t('settingsHub.variables.title')}
          columns={columns}
          rows={variables.data}
          getRowKey={(v) => v.id}
          empty={<p className="m-0 text-sm text-muted">{t('settingsHub.variables.empty')}</p>}
        />
      )}
      {editing && (
        <VariableDialog
          variable={editing.variable}
          saving={save.isPending}
          onClose={() => setEditing(null)}
          onSave={(input) => save.mutate({ id: editing.variable?.id ?? null, input })}
        />
      )}
      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        size="sm"
        title={t('settingsHub.variables.deleteTitle', { name: deleting?.name ?? '' })}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t('settingsHub.variables.cancel')}
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting)}>
              {t('settingsHub.variables.delete')}
            </Button>
          </>
        }
      >
        <p className="m-0 text-base text-muted">{t('settingsHub.variables.deleteBody')}</p>
      </Dialog>
    </Card>
  );
}
