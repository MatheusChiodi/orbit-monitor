import { describe, expect, it } from 'vitest';
import { sanitizeSvg, svgDataUrl } from './sanitizeSvg';

const wrap = (inner: string, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${inner}</svg>`;
const svgOf = (source: string) => {
  const result = sanitizeSvg(source);
  if (!result.ok) throw new Error('expected ok');
  return result.svg;
};

describe('FE-10 SVG sanitizer — hardening', () => {
  it('drops <style>, animation elements and inline style attributes', () => {
    const svg = svgOf(
      wrap('<style>@import url(https://evil.example/x.css)</style><set attributeName="href" to="javascript:x"/><rect style="fill:url(https://evil.example)" width="1" height="1"/>'),
    );
    expect(svg).not.toMatch(/style|@import|<set|evil/i);
    expect(svg).toContain('<rect');
  });

  it('keeps local url(#id) paints and #id references, drops external ones', () => {
    const svg = svgOf(
      wrap('<defs><linearGradient id="g"><stop offset="0" stop-color="#000"/></linearGradient></defs><rect fill="url(#g)" width="1" height="1"/><use href="#g"/><rect fill="url(https://evil.example/p)" width="1" height="1"/>'),
    );
    expect(svg).toContain('fill="url(#g)"');
    expect(svg).toContain('href="#g"');
    expect(svg).not.toContain('evil');
  });

  it('drops xlink:href to external files and elements outside the SVG namespace', () => {
    const svg = svgOf(
      wrap('<use xlink:href="https://evil.example/sprite.svg#a"/><html:iframe xmlns:html="http://www.w3.org/1999/xhtml" src="https://evil.example"/>', 'xmlns:xlink="http://www.w3.org/1999/xlink"'),
    );
    expect(svg).not.toMatch(/evil|iframe/);
  });

  it('rejects malformed XML', () => {
    expect(sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><rect></svg')).toEqual({
      ok: false,
      error: { key: 'branding.errors.notSvg' },
    });
  });

  it('builds an encoded data URL for <img>', () => {
    expect(svgDataUrl('<svg/>')).toBe('data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E');
  });
});
