import type { Message } from '@/shared/i18n/message';

/**
 * FE-10: allowlist sanitizer for the workspace logo (docs/04-data-protection.md).
 * Drops scripts, event handlers, foreignObject, styles, animations and every external or `data:` reference;
 * only same-document references (`#id`) survive. The result is still rendered through `<img>` (defense in depth).
 */
export const MAX_LOGO_BYTES = 64 * 1024;

export type SanitizeSvgResult = { ok: true; svg: string } | { ok: false; error: Message };

const SVG_NS = 'http://www.w3.org/2000/svg';

const ALLOWED_ELEMENTS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan',
  'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath', 'mask', 'pattern', 'symbol', 'use',
  'title', 'desc',
]);

/** Containers whose children may be kept (links lose their target). */
const UNWRAP_ELEMENTS = new Set(['a', 'switch']);

const ALLOWED_ATTRIBUTES = new Set([
  'xmlns', 'xmlns:xlink', 'version', 'id', 'viewbox', 'preserveaspectratio', 'width', 'height',
  'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'd', 'points', 'transform',
  'fill', 'fill-opacity', 'fill-rule', 'clip-rule', 'clip-path', 'mask', 'opacity', 'visibility', 'display',
  'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'stroke-dasharray',
  'stroke-dashoffset', 'stroke-miterlimit', 'offset', 'stop-color', 'stop-opacity', 'gradientunits',
  'gradienttransform', 'spreadmethod', 'patternunits', 'patterncontentunits', 'patterntransform',
  'maskunits', 'maskcontentunits', 'clippathunits', 'font-size', 'font-family', 'font-weight', 'font-style',
  'text-anchor', 'dominant-baseline', 'letter-spacing', 'href', 'xlink:href',
]);

const REFERENCE_ATTRIBUTES = new Set(['href', 'xlink:href']);
const LOCAL_REFERENCE = /^#[\w.-]+$/;
const URL_FUNCTION = /url\s*\(/i;
const LOCAL_URL_ONLY = /^url\(\s*#[\w.-]+\s*\)$/i;

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function safeAttribute(name: string, value: string): boolean {
  const lower = name.toLowerCase();
  if (!ALLOWED_ATTRIBUTES.has(lower)) return false;
  const trimmed = value.trim();
  if (REFERENCE_ATTRIBUTES.has(lower)) return LOCAL_REFERENCE.test(trimmed);
  if (URL_FUNCTION.test(trimmed)) return LOCAL_URL_ONLY.test(trimmed);
  return !/javascript:|data:/i.test(trimmed);
}

function clean(element: Element): void {
  for (const attribute of [...element.attributes]) {
    if (!safeAttribute(attribute.name, attribute.value)) element.removeAttributeNode(attribute);
  }
  for (const child of [...element.children]) {
    const name = child.localName.toLowerCase();
    if (child.namespaceURI === SVG_NS && ALLOWED_ELEMENTS.has(name)) {
      clean(child);
    } else if (child.namespaceURI === SVG_NS && UNWRAP_ELEMENTS.has(name)) {
      clean(child);
      child.replaceWith(...child.childNodes);
    } else {
      child.remove();
    }
  }
  // Comments and processing instructions carry no drawing; drop them.
  for (const node of [...element.childNodes]) {
    if (node.nodeType === Node.COMMENT_NODE || node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) node.remove();
  }
}

export function sanitizeSvg(source: string): SanitizeSvgResult {
  if (byteLength(source) > MAX_LOGO_BYTES) return { ok: false, error: { key: 'branding.errors.tooLarge' } };
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = doc.documentElement;
  if (doc.getElementsByTagName('parsererror').length > 0 || root.localName !== 'svg' || root.namespaceURI !== SVG_NS) {
    return { ok: false, error: { key: 'branding.errors.notSvg' } };
  }
  clean(root);
  return { ok: true, svg: new XMLSerializer().serializeToString(root) };
}

/** `data:` URL for an already sanitized SVG, rendered with `<img>` so nothing in it can run. */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
