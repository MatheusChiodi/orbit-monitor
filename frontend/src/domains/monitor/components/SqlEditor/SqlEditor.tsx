import { useId } from 'react';
import { Badge } from '@/shared/ui';
import { checkSelect } from '../../sql';

export interface SqlEditorProps {
  value: string;
  onChange: (sql: string) => void;
}

const GUARDS = ['Somente SELECT', 'Timeout 5s', 'Máx. 500 linhas', 'Credencial no cofre'];

/** Editor do SELECT com os guardas sempre visíveis e validação instantânea. */
export function SqlEditor({ value, onChange }: SqlEditorProps) {
  const errorId = useId();
  const error = value.trim() === '' ? null : checkSelect(value);
  return (
    <div className="flex flex-col gap-[0.5rem]">
      <textarea
        aria-label="Consulta SQL"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="SELECT COUNT(*) AS QTD FROM FILA_CONCILIACAO WHERE STATUS = 'PENDENTE'"
        className="min-h-[9rem] w-full resize-y rounded-[0.45rem] border border-line-2 bg-bg p-[0.7rem] font-mono text-[0.85rem] text-text placeholder:text-dim focus:border-info focus:outline-none aria-invalid:border-down"
      />
      <ul className="m-0 flex list-none flex-wrap gap-[0.4rem] p-0" aria-label="Guardas da consulta">
        {GUARDS.map((guard) => (
          <li key={guard}>
            <Badge tone="INFO">{guard}</Badge>
          </li>
        ))}
      </ul>
      {error && (
        <p id={errorId} role="alert" className="m-0 text-[0.85rem] text-down-text">
          {error}
        </p>
      )}
    </div>
  );
}
