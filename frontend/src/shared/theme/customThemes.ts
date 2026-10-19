import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { ConfigClient } from '@/shared/api/configResources';
import { isBuiltInThemeId } from './registry';
import { validateTheme } from './schema';
import type { OrbitTheme } from './types';

/**
 * Custom themes live in `orbit.themes.json` (docs/06), served by the generic config API
 * (`/api/themes`, `{ version, items }`). The browser never keeps its own copy.
 */
export type ThemesClient = Pick<ConfigClient, 'list' | 'create' | 'update' | 'remove'>;
export const CUSTOM_THEMES_QUERY_KEY = ['config', 'themes'] as const;

/** Untrusted file content → clean custom themes; invalid items and built-in ids are dropped. */
export function sanitizeCustomThemes(items: readonly unknown[]): OrbitTheme[] {
  const seen = new Set<string>();
  const themes: OrbitTheme[] = [];
  for (const item of items) {
    const result = validateTheme(typeof item === 'object' && item !== null ? { ...item, category: 'custom' } : item);
    if (!result.ok || isBuiltInThemeId(result.theme.id) || seen.has(result.theme.id)) continue;
    seen.add(result.theme.id);
    themes.push(result.theme);
  }
  return themes;
}

const NONE: readonly OrbitTheme[] = [];

export function useCustomThemes(client: ThemesClient) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: CUSTOM_THEMES_QUERY_KEY,
    queryFn: async () => sanitizeCustomThemes((await client.list('themes')).items),
  });
  const themes = query.data ?? NONE;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: CUSTOM_THEMES_QUERY_KEY });

  const saveMutation = useMutation({
    mutationFn: async (theme: OrbitTheme) => {
      if (isBuiltInThemeId(theme.id)) throw new Error(`Theme id ${theme.id} is reserved for a built-in theme`);
      const clean = { ...theme, category: 'custom' as const };
      const current = queryClient.getQueryData<OrbitTheme[]>(CUSTOM_THEMES_QUERY_KEY) ?? [];
      return current.some((t) => t.id === theme.id) ? client.update('themes', theme.id, clean) : client.create('themes', clean);
    },
    onSettled: invalidate,
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => client.remove('themes', id),
    onSettled: invalidate,
  });

  const { mutateAsync: saveAsync } = saveMutation;
  const { mutateAsync: removeAsync } = removeMutation;
  const save = useCallback(async (theme: OrbitTheme) => {
    await saveAsync(theme);
  }, [saveAsync]);
  const remove = useCallback(async (id: string) => {
    await removeAsync(id);
  }, [removeAsync]);

  return { themes, isLoading: query.isLoading, error: query.error, save, remove };
}
