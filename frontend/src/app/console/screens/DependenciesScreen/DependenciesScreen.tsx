import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DependencyGraph } from '@/domains/workspace/DependencyGraph';
import { safeText } from '@/shared/privacy/redact';
import { Button, Field, IconButton, IconTrash, PageHeader, Panel, Select } from '@/shared/ui';
import { useConsole, useGroups, useMonitors } from '../../ConsoleContext';
import { ScreenStatus } from '../ScreenStatus';
import { createsCycle, dependencyOptions, toGraph } from './dependencyNodes';

/** FE-42: `#/dependencies` — graph with impact radius from `/api/dependencies`; editors add and remove links. */
export function DependenciesScreen() {
  const { t } = useTranslation();
  const { source, demo, editable } = useConsole();
  const queryClient = useQueryClient();
  const groups = useGroups();
  const monitors = useMonitors();
  const items = useQuery({ queryKey: ['dependencies', demo], queryFn: source.listDependencies });
  const [upstream, setUpstream] = useState('');
  const [downstream, setDownstream] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['dependencies', demo] });
  const save = useMutation({ mutationFn: source.saveDependency, onSuccess: refresh });
  const remove = useMutation({ mutationFn: source.deleteDependency, onSuccess: refresh });

  const graph = toGraph(items.data ?? [], groups.data ?? [], monitors.data ?? []);
  const options = dependencyOptions(groups.data ?? [], monitors.data ?? []);
  const all = [...options.groups, ...options.monitors];
  const label = (id: string) => safeText(all.find((o) => o.id === id)?.label ?? id);

  function add() {
    if (!upstream || !downstream || upstream === downstream) return setError(t('screens.dependencies.invalid'));
    if (createsCycle(graph.edges, upstream, downstream)) return setError(t('screens.dependencies.cycle'));
    setError(null);
    save.mutate({ id: `dep-${upstream}-${downstream}`, upstream, downstream });
  }

  const choices = (
    <>
      {(['groups', 'monitors'] as const).map((kind) =>
        options[kind].length > 0 ? (
          <optgroup key={kind} label={t(`ops.dependencies.${kind}`)}>
            {options[kind].map((o) => (
              <option key={o.id} value={o.id}>
                {safeText(o.label)}
              </option>
            ))}
          </optgroup>
        ) : null,
      )}
    </>
  );
  const message = error ?? save.error?.message;

  return (
    <>
      <PageHeader title={t('screens.dependencies.title')} description={t('ops.dependencies.description')} />
      <ScreenStatus pending={items.isPending} error={items.error} />
      <div className="flex flex-col gap-6">
        {items.data && <DependencyGraph nodes={graph.nodes} edges={graph.edges} />}
        {items.data && items.data.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="section-label m-0">{t('ops.dependencies.list')}</h2>
            <ul className="m-0 flex list-none flex-col rounded-md border border-line p-0">
              {items.data.map((item) => (
                <li key={item.id} className="flex items-center gap-3 border-b border-line px-3 py-2 last:border-b-0">
                  <span className="min-w-0 flex-1 text-base text-text">
                    {t('ops.dependencies.sentence', { upstream: label(item.upstream), downstream: label(item.downstream) })}
                  </span>
                  {editable && (
                    <IconButton
                      label={t('screens.dependencies.remove', { from: label(item.upstream), to: label(item.downstream) })}
                      icon={IconTrash}
                      onClick={() => remove.mutate(item.id)}
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        {editable && items.data && (
          <Panel title={t('screens.dependencies.add')} surface="solid">
            <div className="flex flex-wrap items-end gap-3">
              <Field label={t('screens.dependencies.upstream')} className="min-w-48 flex-1">
                <Select placeholder={t('form.choose')} value={upstream} onChange={(e) => setUpstream(e.target.value)}>
                  {choices}
                </Select>
              </Field>
              <Field label={t('screens.dependencies.downstream')} className="min-w-48 flex-1">
                <Select placeholder={t('form.choose')} value={downstream} onChange={(e) => setDownstream(e.target.value)}>
                  {choices}
                </Select>
              </Field>
              <Button variant="primary" onClick={add} loading={save.isPending}>
                {t('screens.dependencies.add')}
              </Button>
            </div>
            {upstream && downstream && upstream !== downstream && !message && (
              <p className="m-0 mt-3 text-sm text-muted">{t('ops.dependencies.sentence', { upstream: label(upstream), downstream: label(downstream) })}</p>
            )}
            {message && (
              <p role="alert" className="m-0 mt-3 text-base text-down-text">
                {message}
              </p>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}
