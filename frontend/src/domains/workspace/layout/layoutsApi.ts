import { ApiError, createApiCore, type ApiClientOptions } from '@/shared/api/client';
import { isAnimationLevel, type AnimationLevel } from '@/shared/motion/animationLevel';
import { THEME_ID_PATTERN } from '@/shared/theme/types';
import type { Playlist } from '@/domains/wall/playlist/playlist';
import { isBlockKind } from './blockKinds';
import type { LayoutBlock } from './grid';

/**
 * One item of `orbit.layouts.json`, addressed on the wall by its slug (`/wall/noc`).
 * Assumed BE-41 contract: `{ id, slug, name, version, blocks, themeId?, animationLevel?, playlist? }`.
 */
export interface WallLayout {
  id: string;
  slug: string;
  name: string;
  blocks: LayoutBlock[];
  version?: number;
  /** FE-05: theme of this wall layout (beats the device and workspace themes, not `?theme=`). */
  themeId?: string;
  /** FE-06: animation level of this wall layout (beats the device and workspace levels, not `?motion=`). */
  animationLevel?: AnimationLevel;
  /** FE-19: rotate these layouts (by slug) on the wall that opens this one. */
  playlist?: Playlist;
  [key: string]: unknown;
}

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
const RANGES = new Set(['24h', '7d', '30d']);
const MAX_TEXT = 280;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown, min: number): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.round(v)) : null);

function normalizeBlock(raw: unknown, index: number): LayoutBlock | null {
  if (!isRecord(raw)) return null;
  const kind = raw.kind ?? raw.type;
  const [x, y, w, h] = [int(raw.x, 0), int(raw.y, 0), int(raw.w, 1), int(raw.h, 1)];
  if (!isBlockKind(kind) || x === null || y === null || w === null || h === null) return null;
  const id = typeof raw.id === 'string' && raw.id ? raw.id : `${kind}-${index + 1}`;
  const block: LayoutBlock = { id, kind, x, y, w, h };
  if (typeof raw.source === 'string' && raw.source) block.source = raw.source;
  if (typeof raw.range === 'string' && RANGES.has(raw.range)) block.range = raw.range as LayoutBlock['range'];
  if (typeof raw.text === 'string') block.text = raw.text.slice(0, MAX_TEXT);
  if (raw.allowPersonalData === true) block.allowPersonalData = true;
  return block;
}

function normalizePlaylist(raw: unknown): Playlist | null {
  if (!isRecord(raw) || !Array.isArray(raw.entries)) return null;
  const entries = raw.entries.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.layout !== 'string' || !SLUG_PATTERN.test(entry.layout)) return [];
    const seconds = int(entry.seconds, 1);
    return seconds === null ? [] : [{ layout: entry.layout, seconds }];
  });
  return entries.length > 0 ? { entries } : null;
}

/** Untrusted API payload → clean layout (unknown block kinds and invalid overrides are dropped). */
export function normalizeLayout(raw: unknown): WallLayout | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.slug !== 'string') return null;
  const blocks = Array.isArray(raw.blocks) ? raw.blocks.flatMap((b, i) => normalizeBlock(b, i) ?? []) : [];
  const layout: WallLayout = { ...raw, id: raw.id, slug: raw.slug, name: typeof raw.name === 'string' ? raw.name : raw.slug, blocks };
  delete layout.themeId;
  delete layout.animationLevel;
  delete layout.playlist;
  if (typeof raw.themeId === 'string' && THEME_ID_PATTERN.test(raw.themeId)) layout.themeId = raw.themeId;
  if (isAnimationLevel(raw.animationLevel)) layout.animationLevel = raw.animationLevel;
  const playlist = normalizePlaylist(raw.playlist);
  if (playlist) layout.playlist = playlist;
  return layout;
}

function items(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  return isRecord(payload) && Array.isArray(payload.items) ? payload.items : [];
}

/** Blocks travel with both `kind` (frontend) and `type` (BE-41 record) so either side keeps them. */
function toRequest(layout: WallLayout): WallLayout {
  return { ...layout, blocks: layout.blocks.map((block) => ({ ...block, type: block.kind })) };
}

/** FE-11: layouts are read and written only through `/api/layouts`; nothing is kept in the browser. */
export function createLayoutsApi(options: ApiClientOptions = {}) {
  const { request } = createApiCore(options);
  return {
    async list(): Promise<WallLayout[]> {
      try {
        return items(await request<unknown>('/api/layouts')).flatMap((raw) => normalizeLayout(raw) ?? []);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return [];
        throw error;
      }
    },
    /** Any client may read a layout by slug; null when it does not exist. */
    async bySlug(slug: string): Promise<WallLayout | null> {
      try {
        return normalizeLayout(await request<unknown>(`/api/layouts/${encodeURIComponent(slug)}`));
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    save: (layout: WallLayout) =>
      request<unknown>(`/api/layouts/${encodeURIComponent(layout.id)}`, { method: 'PUT', body: toRequest(layout) }).then(
        (saved) => normalizeLayout(saved) ?? layout,
      ),
  };
}

export type LayoutsApi = ReturnType<typeof createLayoutsApi>;
