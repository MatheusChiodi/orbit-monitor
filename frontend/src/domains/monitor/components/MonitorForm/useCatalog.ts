import { useEffect, useState } from 'react';
import type { CatalogTable, SavedQuery } from '@/shared/api/consoleTypes';
import type { SqlCatalog } from '../SqlCodeEditor';
import type { CatalogStatus } from './TargetFields';

/** FE-33: catalog of the chosen connection (names and types only, never rows); failures just disable suggestions. */
export function useCatalog(connectionId: string, load?: (connectionId: string) => Promise<CatalogTable[]>) {
  const [state, setState] = useState<{ id: string; catalog: SqlCatalog; status: CatalogStatus }>({
    id: '',
    catalog: { tables: [] },
    status: 'idle',
  });

  useEffect(() => {
    if (!connectionId || !load) return;
    let alive = true;
    setState({ id: connectionId, catalog: { tables: [] }, status: 'loading' });
    load(connectionId).then(
      (tables) => {
        if (!alive) return;
        const catalog = { tables: tables.map((table) => ({ name: table.name, columns: table.columns.map((c) => c.name) })) };
        setState({ id: connectionId, catalog, status: 'ready' });
      },
      () => alive && setState({ id: connectionId, catalog: { tables: [] }, status: 'unavailable' }),
    );
    return () => {
      alive = false;
    };
  }, [connectionId, load]);

  return state.id === connectionId ? state : { catalog: { tables: [] }, status: 'idle' as const };
}

/** BE-12: saved queries of the chosen connection; none when the API does not answer. */
export function useSavedQueries(connectionId: string, load?: (connectionId: string) => Promise<SavedQuery[]>): SavedQuery[] {
  const [state, setState] = useState<{ id: string; queries: SavedQuery[] }>({ id: '', queries: [] });
  useEffect(() => {
    if (!connectionId || !load) return;
    let alive = true;
    load(connectionId).then(
      (queries) => alive && setState({ id: connectionId, queries }),
      () => alive && setState({ id: connectionId, queries: [] }),
    );
    return () => {
      alive = false;
    };
  }, [connectionId, load]);
  return state.id === connectionId ? state.queries : [];
}
