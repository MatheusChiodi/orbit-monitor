/** Item of `orbit.status-pages.json`: only which groups to show; never values, rules or personal data. */
export interface StatusPageItem {
  title: string;
  slug: string;
  visibility: 'public' | 'internal';
  groupIds: string[];
}

export function toStatusPageItem(draft: StatusPageItem): StatusPageItem {
  return { title: draft.title.trim(), slug: draft.slug, visibility: draft.visibility, groupIds: [...draft.groupIds] };
}

/** "Payments & Cards" → "payments-cards". */
export function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(slug);
}

/** Full address of a status page, as served by `GET /api/status/{slug}` (BE-42). */
export function statusPageUrl(slug: string, origin: string = window.location.origin): string {
  return `${origin}/api/status/${slug}`;
}
