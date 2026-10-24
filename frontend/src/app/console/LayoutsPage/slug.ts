import { SLUG_PATTERN } from '@/domains/workspace/layout/layoutsApi';

/** Wall address from a layout name ("Sala de operações" → "sala-de-operacoes"), unique among `taken`. */
export function uniqueSlug(name: string, taken: readonly string[]): string {
  const base =
    name
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 36) || 'layout';
  const used = new Set(taken);
  let slug = base;
  for (let n = 2; used.has(slug) || !SLUG_PATTERN.test(slug); n++) slug = `${base}-${n}`;
  return slug;
}
