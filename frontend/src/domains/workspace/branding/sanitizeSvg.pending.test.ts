import { describe, expect, it } from 'vitest';
import { MAX_LOGO_BYTES, sanitizeSvg } from './sanitizeSvg';

const clean = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#3b9eff"/></svg>';

describe('FE-10 workspace branding — SVG sanitizer', () => {
  it('keeps a plain SVG', () => {
    const result = sanitizeSvg(clean);
    expect(result.ok).toBe(true);
    expect(result.ok && result.svg).toContain('<circle');
  });

  it('removes scripts, event handlers and foreignObject', () => {
    const dirty =
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><foreignObject><div/></foreignObject><rect onclick="x()" width="1" height="1"/></svg>';
    const result = sanitizeSvg(dirty);
    expect(result.ok).toBe(true);
    const svg = result.ok ? result.svg : '';
    expect(svg).not.toMatch(/script|onload|onclick|foreignObject/i);
    expect(svg).toContain('<rect');
  });

  it('removes javascript: and external references', () => {
    const dirty =
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect width="1" height="1"/></a><image href="https://evil.example/x.png"/><use href="data:image/svg+xml;base64,AA"/></svg>';
    const svg = sanitizeSvg(dirty);
    expect(svg.ok && svg.svg).not.toMatch(/javascript:|https:\/\/evil|data:/);
  });

  it('rejects non-SVG content and oversized files', () => {
    expect(sanitizeSvg('<html><body/></html>')).toEqual({ ok: false, error: { key: 'branding.errors.notSvg' } });
    expect(sanitizeSvg(`<svg>${' '.repeat(MAX_LOGO_BYTES + 1)}</svg>`)).toEqual({
      ok: false,
      error: { key: 'branding.errors.tooLarge' },
    });
  });
});
