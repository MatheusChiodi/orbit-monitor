import type { Condition, ConditionOperator, Severity } from '@/shared/api/types';
import { Button, INPUT_CLASS, SELECT_CLASS } from '@/shared/ui';
import { evaluateCondition, validateCondition, type EvaluationContext } from '../../conditions';

export interface ConditionEditorProps {
  conditions: readonly Condition[];
  /** Campos disponíveis no resultado do preview. */
  fields: readonly string[];
  /** Resultado atual para a validação ao vivo; null antes do preview. */
  context: EvaluationContext | null;
  onChange: (conditions: Condition[]) => void;
}

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: '<', label: '<' },
  { value: '<=', label: '<=' },
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: '==', label: '==' },
  { value: '!=', label: '!=' },
  { value: 'between', label: 'between' },
  { value: 'in', label: 'in' },
  { value: 'older_than', label: 'mais recente que' },
];

const LEVELS: { value: Severity; label: string }[] = [
  { value: 'WARN', label: 'Atenção' },
  { value: 'DOWN', label: 'Fora' },
];

const LEVEL_TEXT: Record<Severity, string> = { WARN: 'ATENÇÃO', DOWN: 'FORA' };

function LiveResult({ condition, fields, context }: { condition: Condition; fields: readonly string[]; context: EvaluationContext | null }) {
  const error = validateCondition(condition, fields);
  if (error) return <span className="text-down-text">{error}</span>;
  if (!context) return null;
  const result = evaluateCondition(condition, context);
  if (result === 'invalid') return <span className="text-muted">Não dá para avaliar com o resultado atual</span>;
  if (result === 'fail') {
    return (
      <span className={condition.level === 'DOWN' ? 'text-down-text' : 'text-warn-text'}>
        {`Essa condição falharia agora (${LEVEL_TEXT[condition.level]})`}
      </span>
    );
  }
  return <span className="text-ok-text">Passa com o resultado atual</span>;
}

/** Condições em linhas `campo · operador · valor · nível`, validadas contra o preview. */
export function ConditionEditor({ conditions, fields, context, onChange }: ConditionEditorProps) {
  function update(index: number, patch: Partial<Condition>) {
    onChange(conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function add() {
    onChange([...conditions, { field: fields[0] ?? '', operator: '<', value: '', level: 'WARN' }]);
  }

  return (
    <div className="flex flex-col gap-[0.6rem]">
      {conditions.map((condition, index) => (
        <div
          key={index}
          role="group"
          aria-label={`Condição ${index + 1}`}
          className="flex flex-col gap-[0.3rem] rounded-[0.45rem] border border-line bg-s1 p-[0.6rem]"
        >
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_auto] items-center gap-[0.4rem]">
            <select
              aria-label="Campo"
              className={`${SELECT_CLASS} font-mono`}
              value={condition.field}
              onChange={(e) => update(index, { field: e.target.value })}
            >
              {!fields.includes(condition.field) && <option value={condition.field}>{condition.field || '—'}</option>}
              {fields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              aria-label="Operador"
              className={`${SELECT_CLASS} font-mono`}
              value={condition.operator}
              onChange={(e) => update(index, { operator: e.target.value as ConditionOperator })}
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
            <input
              aria-label="Valor"
              className={`${INPUT_CLASS} font-mono`}
              value={condition.value}
              placeholder={condition.operator === 'between' ? '10..50' : condition.operator === 'older_than' ? '10min' : '200'}
              onChange={(e) => update(index, { value: e.target.value })}
            />
            <select
              aria-label="Nível"
              className={SELECT_CLASS}
              value={condition.level}
              onChange={(e) => update(index, { level: e.target.value as Severity })}
            >
              {LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              aria-label={`Remover condição ${index + 1}`}
              onClick={() => onChange(conditions.filter((_, i) => i !== index))}
            >
              ✕
            </Button>
          </div>
          <p className="m-0 text-[0.78rem]" aria-live="polite">
            <LiveResult condition={condition} fields={fields} context={context} />
          </p>
        </div>
      ))}
      <div>
        <Button variant="neutral" onClick={add} disabled={fields.length === 0}>
          Adicionar condição
        </Button>
      </div>
    </div>
  );
}
