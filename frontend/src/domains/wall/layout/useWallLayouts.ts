import { useEffect, useMemo, useState } from 'react';
import type { LayoutBlock } from '@/domains/workspace/layout/grid';
import type { WallLayout } from '@/domains/workspace/layout/layoutsApi';
import type { AnimationLevel } from '@/shared/motion/animationLevel';
import type { Playlist } from '../playlist/playlist';
import { usePlaylist } from '../playlist/usePlaylist';
import { BUILT_IN_BLOCKS } from './wallLayout';

export type LoadLayout = (slug: string) => Promise<WallLayout | null>;

export interface WallPresentationOptions {
  load: LoadLayout;
  /** Layout the wall was opened with (`/wall/<slug>` or `?layout=`). */
  slug: string;
  /** FE-19: the playlist holds while an incident is unacknowledged. */
  unacknowledgedIncident: boolean;
}

export interface WallPresentation {
  /** False until the opened layout answered (or failed). */
  ready: boolean;
  /** Layout on screen now (changes with the playlist). */
  slug: string;
  blocks: readonly LayoutBlock[];
  themeId: string | null;
  animationLevel: AnimationLevel | null;
  playlist: { index: number; total: number; paused: boolean } | null;
}

const NO_PLAYLIST: Playlist = { entries: [] };

async function safeLoad(load: LoadLayout, slug: string): Promise<WallLayout | null> {
  try {
    return await load(slug);
  } catch {
    return null;
  }
}

/** FE-11 / FE-19: loads the opened layout and the layouts of its playlist, and picks the one on screen. */
export function useWallPresentation({ load, slug, unacknowledgedIncident }: WallPresentationOptions): WallPresentation {
  const [layouts, setLayouts] = useState<Record<string, WallLayout | null>>({});
  const root = layouts[slug];
  const ready = root !== undefined;

  useEffect(() => {
    let current = true;
    void safeLoad(load, slug).then((layout) => current && setLayouts((all) => ({ ...all, [slug]: layout })));
    return () => {
      current = false;
    };
  }, [load, slug]);

  const playlist = root?.playlist ?? NO_PLAYLIST;
  const entrySlugs = useMemo(() => [...new Set(playlist.entries.map((e) => e.layout))].join(' '), [playlist]);

  useEffect(() => {
    if (!entrySlugs) return;
    let current = true;
    for (const entry of entrySlugs.split(' ')) {
      if (entry === slug) continue;
      void safeLoad(load, entry).then((layout) => current && setLayouts((all) => ({ ...all, [entry]: layout })));
    }
    return () => {
      current = false;
    };
  }, [entrySlugs, load, slug]);

  const state = usePlaylist(playlist, { unacknowledgedIncident });
  const shownSlug = state.layout ?? slug;
  const shown = shownSlug === slug ? root : layouts[shownSlug];
  const rotating = playlist.entries.length > 1;

  return {
    ready,
    slug: shownSlug,
    blocks: shown && shown.blocks.length > 0 ? shown.blocks : BUILT_IN_BLOCKS,
    themeId: shown?.themeId ?? null,
    animationLevel: shown?.animationLevel ?? null,
    playlist: rotating ? { index: state.index, total: playlist.entries.length, paused: state.paused } : null,
  };
}
