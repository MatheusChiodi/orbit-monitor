import type { ColumnType, PreviewResult } from '@/shared/api/types';
import { formatDuration } from '@/shared/format';
import { READ_MODE_LABEL, suggestReadMode } from '../../display';

export interface PreviewTableProps {
  preview: PreviewResult;
  maxRows?: number;
}

const TYPE_LABEL: Record<ColumnType, string> = {
  number: 'número',
  text: 'texto',
  date: 'data',
  boolean: 'booleano',
};

/** Resultado do preview em tabela, com os tipos detectados de cada coluna. */
export function PreviewTable({ preview, maxRows = 50 }: PreviewTableProps) {
  const { columns, rows } = preview;
  const summary = `${rows.length} ${rows.length === 1 ? 'linha' : 'linhas'} · ${formatDuration(preview.elapsedMs)}`;
  return (
    <div className="flex min-w-0 flex-col gap-[0.5rem]">
      <div className="flex flex-wrap items-center gap-[0.8rem] text-[0.8rem] text-muted">
        {preview.status !== undefined && <span className="font-mono text-text">{`HTTP ${preview.status}`}</span>}
        <span className="font-mono">{summary}</span>
        <span className="ml-auto text-info">{`Sugestão: ${READ_MODE_LABEL[suggestReadMode(preview)]}`}</span>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 text-[0.85rem] text-muted">A consulta não devolveu linhas</p>
      ) : (
        <div className="overflow-auto rounded-[0.45rem] border border-line">
          <table aria-label="Resultado do preview" className="w-full border-collapse text-[0.8rem]">
            <thead className="bg-s2">
              <tr>
                {columns.map((col) => (
                  <th key={col.name} scope="col" className="px-[0.6rem] py-[0.4rem] text-left font-semibold">
                    <span className="block font-mono">{col.name}</span>
                    <span className="block text-[0.7rem] font-normal text-muted">{TYPE_LABEL[col.type]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, maxRows).map((row, i) => (
                <tr key={i} className="border-t border-line">
                  {columns.map((col) => {
                    const value = row[col.name];
                    return (
                      <td key={col.name} className="px-[0.6rem] py-[0.35rem] font-mono">
                        {value === null || value === undefined ? <span className="text-dim">NULL</span> : String(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
