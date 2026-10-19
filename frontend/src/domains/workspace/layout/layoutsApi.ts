import { createConfigClient } from '@/shared/api/configResources';
import type { ApiClientOptions } from '@/shared/api/client';
import type { LayoutBlock } from './grid';

/** One item of `orbit.layouts.json`, addressed on the wall by its slug (`/wall/noc`). */
export interface WallLayout {
  id: string;
  slug: string;
  name: string;
  blocks: LayoutBlock[];
  [key: string]: unknown;
}

/** FE-11: layouts are read and written only through `/api/layouts`; nothing is kept in the browser. */
export function createLayoutsApi(options: ApiClientOptions = {}) {
  const client = createConfigClient(options);
  return {
    async list(): Promise<WallLayout[]> {
      const file = await client.list<WallLayout>('layouts');
      return file.items;
    },
    save: (layout: WallLayout) => client.update<WallLayout>('layouts', layout.id, layout),
  };
}

export type LayoutsApi = ReturnType<typeof createLayoutsApi>;
