import { formatDuration } from '@/shared/format';
import { safeText } from '@/shared/privacy/redact';
import type { SlaCsvRow } from './sla';

/**
 * Minimal PDF 1.4 writer for text reports (FE-43): one Helvetica font, WinAnsi encoding, A4 pages.
 * Written in-house instead of adding a PDF library (jsPDF/pdf-lib) for a table of text lines.
 */

const WIN_ANSI_EXTRA: Record<string, number> = {
  '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
};

/** One byte per character: Latin-1 as is, a few WinAnsi extras, `?` for anything else. */
function winAnsi(text: string): string {
  let out = '';
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) out += char;
    else if (WIN_ANSI_EXTRA[char] !== undefined) out += String.fromCharCode(WIN_ANSI_EXTRA[char]);
    else out += '?';
  }
  return out;
}

const escapePdf = (text: string) => winAnsi(text).replace(/[\\()]/g, (c) => `\\${c}`).replace(/[\r\n]/g, ' ');

const LINES_PER_PAGE = 50;
const PAGE = { width: 595, height: 842, margin: 50, leading: 14 };

export function simplePdf(lines: readonly string[]): Uint8Array {
  const pages: string[][] = [];
  for (let i = 0; i < Math.max(lines.length, 1); i += LINES_PER_PAGE) pages.push(lines.slice(i, i + LINES_PER_PAGE));

  // Objects: 1 catalog, 2 pages, 3 font, then (page, content) pairs.
  const objects: string[] = [];
  const kids = pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ');
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  pages.forEach((pageLines, i) => {
    const body = [
      'BT',
      '/F1 10 Tf',
      `${PAGE.leading} TL`,
      `${PAGE.margin} ${PAGE.height - PAGE.margin} Td`,
      ...pageLines.map((line) => `(${escapePdf(line)}) Tj T*`),
      'ET',
    ].join('\n');
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`,
    );
    objects.push(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(pdf, (c) => c.charCodeAt(0));
}

/** SLA table as PDF; names go through the same redaction as the screen and the CSV. */
export function slaToPdf(rows: readonly SlaCsvRow[], { header }: { header: readonly string[] }): Uint8Array {
  const cell = (text: string, width: number) => (text.length > width ? `${text.slice(0, width - 1)}…` : text.padEnd(width));
  const lines = [...header, ''];
  lines.push(`${cell('Monitor', 34)} ${cell('Group', 20)} ${cell('Uptime', 9)} ${cell('Down', 12)} #`);
  for (const row of rows) {
    lines.push(
      [
        cell(safeText(row.name), 34),
        cell(safeText(row.groupName), 20),
        cell(row.uptime === null ? '—' : `${row.uptime.toFixed(2)}%`, 9),
        cell(formatDuration(row.downMs), 12),
        String(row.incidents),
      ].join(' '),
    );
  }
  return simplePdf(lines);
}
