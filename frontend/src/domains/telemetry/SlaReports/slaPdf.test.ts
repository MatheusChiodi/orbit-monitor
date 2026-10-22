import { describe, expect, it } from 'vitest';
import { simplePdf, slaToPdf } from './slaPdf';

const text = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes);

describe('FE-43 PDF export', () => {
  it('writes a valid single-file PDF with a correct xref table', () => {
    const pdf = text(simplePdf(['Hello (world) \\ ok']));
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(pdf).toContain('(Hello \\(world\\) \\\\ ok) Tj');
    const xref = Number(/startxref\s+(\d+)/.exec(pdf)![1]);
    expect(pdf.slice(xref, xref + 4)).toBe('xref');
    const offsets = [...pdf.slice(xref).matchAll(/^(\d{10}) 00000 n/gm)].map((m) => Number(m[1]));
    offsets.forEach((offset, i) => expect(pdf.slice(offset).startsWith(`${i + 1} 0 obj\n`)).toBe(true));
  });

  it('keeps Latin-1 accents and replaces characters outside WinAnsi', () => {
    const bytes = simplePdf(['Relatório ✓']);
    const pdf = text(bytes);
    expect(pdf).toContain('(Relatório ?) Tj');
  });

  it('paginates long reports', () => {
    const pdf = text(simplePdf(Array.from({ length: 120 }, (_, i) => `line ${i}`)));
    expect(pdf).toContain('/Count 3');
  });

  it('SLA rows are redacted: a card number never reaches the PDF', () => {
    const pdf = text(
      slaToPdf(
        [{ name: 'Card 4111 1111 1111 1111 refunds', groupName: 'Payments', uptime: 99.5, downMs: 60_000, incidents: 1 }],
        { header: ['Orbit SLA report', 'Period: 24 h'] },
      ),
    );
    expect(pdf).not.toMatch(/4111\s?1111\s?1111\s?1111/);
    expect(pdf).toContain('1111 refunds');
    expect(pdf).toContain('99.50%');
  });
});
