import type { StatusPageDraft } from '@/domains/workspace/StatusPageBuilder';
import type { StatusPageRecord } from '@/shared/api/consoleTypes';

export function fromRecord(record: StatusPageRecord): StatusPageDraft {
  return {
    title: record.title || record.slug,
    slug: record.slug,
    visibility: record.pub ? 'public' : 'internal',
    groupIds: record.groupIds ?? [],
  };
}

/** Only title, slug, visibility and group ids are stored (BE-42: no values, errors or names). */
export function toRecord(draft: StatusPageDraft, existing: readonly StatusPageRecord[]): StatusPageRecord {
  const id = existing.find((r) => r.slug === draft.slug)?.id ?? `sp-${draft.slug}`;
  return { id, slug: draft.slug, title: draft.title, pub: draft.visibility === 'public', groupIds: [...draft.groupIds] };
}
