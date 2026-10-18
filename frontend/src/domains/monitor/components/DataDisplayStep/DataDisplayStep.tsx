import type { DisplayMode, FieldDisplay } from '@/shared/api/types';
import type { FieldFormat } from '@/shared/format';
import { INPUT_CLASS, SELECT_CLASS } from '@/shared/ui';

export interface DataDisplayStepProps {
  fields: readonly FieldDisplay[];
  onChange: (fields: FieldDisplay[]) => void;
}

const FORMATS: { value: FieldFormat; label: string }[] = [
  { value: 'integer', label: 'Inteiro' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'currency', label: 'Moeda' },
  { value: 'percent', label: 'Percentual' },
  { value: 'duration', label: 'Duração' },
  { value: 'relative', label: 'Data relativa' },
  { value: 'text', label: 'Texto' },
];

const DISPLAYS: { value: DisplayMode; label: string }[] = [
  { value: 'number', label: 'Número' },
  { value: 'gauge', label: 'Medidor' },
  { value: 'indicators', label: 'Indicadores' },
  { value: 'line', label: 'Gráfico de linha' },
  { value: 'bars', label: 'Barras / ranking' },
  { value: 'table', label: 'Tabela' },
  { value: 'text', label: 'Texto / estado' },
  { value: 'semaphore', label: 'Semáforo' },
  { value: 'hidden', label: 'Oculto' },
];

/**
 * Passo "Dados e exibição": marcar o que guardar e como cada campo aparece.
 * Campos não marcados não são armazenados.
 */
export function DataDisplayStep({ fields, onChange }: DataDisplayStepProps) {
  function update(index: number, patch: Partial<FieldDisplay>) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  const selected = fields.filter((f) => f.selected).length;

  return (
    <div className="flex flex-col gap-[0.5rem]">
      <p className="m-0 text-[0.8rem] text-muted">{`${selected} de ${fields.length} campos serão guardados`}</p>
      {fields.map((field, index) => {
        const off = !field.selected;
        return (
          <div
            key={field.field}
            role="group"
            aria-label={field.field}
            className={`grid grid-cols-1 items-center gap-[0.4rem] rounded-[0.45rem] border border-line p-[0.55rem] md:grid-cols-[minmax(9rem,1.2fr)_1.2fr_1fr_0.6fr_auto_1fr] ${off ? 'bg-transparent' : 'bg-s1'}`}
          >
            <label className="flex min-w-0 items-center gap-[0.45rem] font-mono text-[0.8rem]">
              <input
                type="checkbox"
                aria-label={`Guardar ${field.field}`}
                checked={field.selected}
                onChange={(e) => update(index, { selected: e.target.checked })}
              />
              <span className="truncate">{field.field}</span>
            </label>
            <input
              aria-label="Rótulo"
              className={INPUT_CLASS}
              value={field.label}
              disabled={off}
              onChange={(e) => update(index, { label: e.target.value })}
            />
            <select
              aria-label="Formato"
              className={SELECT_CLASS}
              value={field.format}
              disabled={off}
              onChange={(e) => update(index, { format: e.target.value as FieldFormat })}
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <input
              aria-label="Unidade"
              className={INPUT_CLASS}
              value={field.unit ?? ''}
              placeholder="un."
              disabled={off}
              onChange={(e) => update(index, { unit: e.target.value || undefined })}
            />
            <label className="flex items-center gap-[0.35rem] text-[0.78rem] whitespace-nowrap text-muted">
              <input
                type="checkbox"
                aria-label="Guardar como série"
                checked={field.storeAsSeries}
                disabled={off}
                onChange={(e) => update(index, { storeAsSeries: e.target.checked })}
              />
              série
            </label>
            <select
              aria-label="Exibição"
              className={SELECT_CLASS}
              value={field.display}
              disabled={off}
              onChange={(e) => update(index, { display: e.target.value as DisplayMode })}
            >
              {DISPLAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
