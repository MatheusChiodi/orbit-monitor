import type { FieldDisplay, PreviewColumn, PreviewResult } from '@/shared/api/types';

/** Modos de leitura do resultado (02-funcionalidades.md, seção 2.2). */
export type ReadMode = 'single' | 'indicators' | 'ranking' | 'series' | 'table' | 'rowcount';

export const READ_MODE_LABEL: Record<ReadMode, string> = {
  single: 'Valor único',
  indicators: 'Cartão de indicadores',
  ranking: 'Ranking / barras',
  series: 'Série temporal',
  table: 'Tabela',
  rowcount: 'Contagem de linhas',
};

/** QTD_PENDENTES → "Qtd pendentes"; $.fila.tamanho → "Tamanho". */
export function humanizeLabel(field: string): string {
  const last = field.startsWith('$') ? (field.split('.').at(-1) ?? field) : field;
  const words = last.replace(/[\[\]*]/g, '').replace(/[_\-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function suggestReadMode(preview: PreviewResult): ReadMode {
  const { columns, rows } = preview;
  if (rows.length === 0) return 'rowcount';
  const numbers = columns.filter((c) => c.type === 'number');
  const texts = columns.filter((c) => c.type === 'text');
  if (rows.length === 1) {
    return columns.length === 1 && numbers.length === 1 ? 'single' : 'indicators';
  }
  if (columns.some((c) => c.type === 'date')) return 'series';
  if (texts.length === 1 && numbers.length >= 1 && texts.length + numbers.length === columns.length) return 'ranking';
  return 'table';
}

function isPercentColumn(name: string): boolean {
  return /(^|_)(PCT|PERC|TAXA)(_|$)/i.test(name);
}

function numberField(column: PreviewColumn, preview: PreviewResult): FieldDisplay {
  const base = { field: column.name, selected: true, label: humanizeLabel(column.name), storeAsSeries: true };
  if (isPercentColumn(column.name)) return { ...base, format: 'percent', decimals: 1, display: 'number' };
  const allIntegers = preview.rows.every((row) => {
    const value = row[column.name];
    return typeof value !== 'number' || Number.isInteger(value);
  });
  return allIntegers
    ? { ...base, format: 'integer', display: 'number' }
    : { ...base, format: 'decimal', decimals: 2, display: 'number' };
}

function columnField(column: PreviewColumn, preview: PreviewResult): FieldDisplay {
  const base = { field: column.name, selected: true, label: humanizeLabel(column.name), storeAsSeries: false };
  switch (column.type) {
    case 'number':
      return numberField(column, preview);
    case 'date':
      return { ...base, format: 'relative', display: 'text' };
    case 'boolean':
      return { ...base, format: 'text', display: 'semaphore' };
    case 'text':
      return { ...base, format: 'text', display: 'text' };
  }
}

function systemField(field: string, label: string, format: FieldDisplay['format']): FieldDisplay {
  return { field, selected: false, label, format, storeAsSeries: false, display: 'hidden' };
}

/** Passo 1 de "Dados e exibição": lista de campos com rótulo, formato e exibição sugeridos. */
export function suggestFields(preview: PreviewResult, kind: 'SQL' | 'HTTP'): FieldDisplay[] {
  const fields = preview.columns.map((column) => columnField(column, preview));
  if (kind === 'SQL') {
    fields.push(systemField('[ROWS]', 'Linhas', 'integer'), systemField('[EXEC_TIME]', 'Tempo de execução', 'duration'));
  } else {
    fields.push(systemField('[STATUS]', 'Status HTTP', 'integer'), systemField('[RESPONSE_TIME]', 'Tempo de resposta', 'duration'));
  }
  return fields;
}
