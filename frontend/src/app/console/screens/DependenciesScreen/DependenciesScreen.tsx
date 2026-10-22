import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DependencyGraph } from '@/domains/workspace/DependencyGraph';
import { safeText } from '@/shared/privacy/redact';
import { Button, LABEL_CLASS, Panel, SELECT_CLASS } from '@/shared/ui';
import { useConsole, useGroups, useMonitors } from '../../ConsoleContext';
import { ScreenStatus, ScreenTitle } from '../ScreenStatus';
import { createsCycle, toGraph } from './dependencyNodes';

/** FE-42: `#/dependencies` — graph with impact radius from `/api/dependencies`; editors add and remove links. */
export function DependenciesScreen() {
  const { t } = useTranslation();
  const { source, demo, editable } = useConsole();
  const queryClient = useQueryClient();
  const ids = { up: useId(), down: useId() };
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
  const options = [
    ...(groups.data ?? []).map((g) => ({ id: g.id, label: g.name })),
    ...(monitors.data ?? []).map((m) => ({ id: m.id, label: m.name })),
  ];
  const label = (id: string) => safeText(options.find((o) => o.id === id)?.label ?? id);

  function add() {
    if (!upstream || !downstream || upstream === downstream) return setError(t('screens.dependencies.invalid'));
    if (createsCycle(graph.edges, upstream, downstream)) return setError(t('screens.dependencies.cycle'));
    setError(null);
    save.mutate({ id: `dep-${upstream}-${downstream}`, upstream, downstream });
  }

  return (
    <>
      <ScreenTitle>{t('screens.dependencies.title')}</ScreenTitle>
      <ScreenStatus pending={items.isPending} error={items.error} />
      {items.data && <DependencyGraph nodes={graph.nodes} edges={graph.edges} />}
      {editable && items.data && (
        <Panel title={t('screens.dependencies.add')}>
          <div className="flex flex-wrap items-end gap-[0.6rem]">
            {(
              [
                [ids.up, 'upstream', upstream, setUpstream],
                [ids.down, 'downstream', downstream, setDownstream],
              ] as const
            ).map(([id, key, value, set]) => (
              <div key={key} className={LABEL_CLASS}>
                <label htmlFor={id}>{t(`screens.dependencies.${key}`)}</label>
                <select id={id} className={SELECT_CLASS} value={value} onChange={(e) => set(e.target.value)}>
                  <option value="">{t('form.choose')}</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {safeText(o.label)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <Button variant="primary" onClick={add} disabled={save.isPending}>
              {t('screens.dependencies.add')}
            </Button>
          </div>
          {(error ?? save.error?.message) && (
            <p role="alert" className="m-0 mt-[0.5rem] text-[0.85rem] text-down-text">
              {error ?? save.error?.message}
            </p>
          )}
          <ul className="m-0 mt-[0.8rem] flex list-none flex-col gap-[0.3rem] p-0 text-[0.85rem]">
            {(items.data ?? []).map((item) => {
              const text = t('screens.dependencies.remove', { from: label(item.upstream), to: label(item.downstream) });
              return (
                <li key={item.id} className="flex items-center gap-[0.5rem]">
                  <span className="font-mono">{`${label(item.upstream)} → ${label(item.downstream)}`}</span>
                  <Button variant="ghost" aria-label={text} onClick={() => remove.mutate(item.id)}>
                    ✕
                  </Button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </>
  );
}
