import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { ConfigClient } from '@/shared/api/configResources';
import { sanitizeCustomThemes } from './customThemeItems';
import { isBuiltInThemeId } from './registry';
import type { OrbitTheme } from './types';

/**
 * Custom themes live in `orbit.themes.json` (docs/06), served by the generic config API
 * (`/api/themes`, `{ version, items }`). The browser never keeps its own copy.
 */
export { sanitizeCustomThemes } from './customThemeItems';

export type ThemesClient = Pick<ConfigClient, 'list' | 'create' | 'update' | 'remove'>;
export const CUSTOM_THEMES_QUERY_KEY = ['config', 'themes'] as const;

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
