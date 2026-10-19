export type JsonPathSegment = string | number;

const SIMPLE_KEY = /^[A-Za-z_$][\w$]*$/;

/** `['items', '*', 'value']` → `$.items[*].value`; keys that are not identifiers use bracket notation. */
export function jsonPathOf(segments: readonly JsonPathSegment[]): string {
  let path = '$';
  for (const segment of segments) {
    if (typeof segment === 'number' || segment === '*') path += `[${segment}]`;
    else if (SIMPLE_KEY.test(segment)) path += `.${segment}`;
    else path += `['${segment.replace(/'/g, "\\'")}']`;
  }
  return path;
}

export type JsonFieldType = 'number' | 'text' | 'boolean' | 'date';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

export function jsonFieldType(value: unknown): JsonFieldType {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string' && ISO_DATE.test(value)) return 'date';
  return 'text';
}
