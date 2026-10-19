import type { MonitorView, Status } from '@/shared/api/types';

/** FE-30: saved views are device-only UI filters; they never hold probe data. */
export const SAVED_VIEWS_KEY = 'orbit.savedViews';

export interface ViewFilter {
  states: Status[];
  groupIds: string[];
  tags: string[];
  query: string;
}

export interface SavedView {
  id: string;
  name: string;
  filter: ViewFilter;
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

const STATUSES: ReadonlySet<string> = new Set(['OK', 'WARN', 'DOWN']);

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/** Keeps only the filter fields, whatever else an object carries. */
export function sanitizeView(view: SavedView): SavedView {
  const filter = (view.filter ?? {}) as Partial<ViewFilter>;
  return {
    id: String(view.id),
    name: String(view.name),
    filter: {
      states: strings(filter.states).filter((s): s is Status => STATUSES.has(s)),
      groupIds: strings(filter.groupIds),
      tags: strings(filter.tags),
      query: typeof filter.query === 'string' ? filter.query : '',
    },
  };
}

export function applyView(monitors: readonly MonitorView[], view: SavedView): MonitorView[] {
  const { states, groupIds, tags, query } = view.filter;
  const needle = normalize(query.trim());
  return monitors.filter((m) => {
    if (states.length > 0 && !states.includes(m.status)) return false;
    if (groupIds.length > 0 && !groupIds.includes(m.groupId)) return false;
    const monitorTags = (m as MonitorView & { tags?: string[] }).tags ?? [];
    if (tags.length > 0 && !tags.some((tag) => monitorTags.includes(tag))) return false;
    return !needle || normalize(m.name).includes(needle);
  });
}

export function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(SAVED_VIEWS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is SavedView => Boolean(v && typeof v === 'object' && 'id' in v && 'name' in v))
      .map(sanitizeView);
  } catch {
    return [];
  }
}

export function saveViews(views: readonly SavedView[]): void {
  try {
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views.map(sanitizeView)));
  } catch {
    // storage blocked: views last only for this page
  }
}

