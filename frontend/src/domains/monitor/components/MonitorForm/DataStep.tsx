import { useTranslation } from 'react-i18next';
import type { PreviewResult } from '@/shared/api/types';
import { Button, IconChevronDown } from '@/shared/ui';
import { addPickedField } from '../../display';
import { isPreviewable, type MonitorFormState } from '../../form';
import { DataDisplayStep } from '../DataDisplayStep';
import { JsonExplorer } from '../JsonExplorer';

function parseJson(body: string | null | undefined): unknown {
  if (!body) return undefined;
  const trimmed = body.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

export interface DataStepProps {
  state: MonitorFormState;
  preview: PreviewResult | null;
  onChange: (patch: Partial<MonitorFormState>) => void;
  onGoToTarget: () => void;
}

/** Step 2: which values to keep and how they show; values from the JSON answer can be added. */
export function DataStep({ state, preview, onChange, onGoToTarget }: DataStepProps) {
  const { t } = useTranslation();
  if (!isPreviewable(state.type)) return <p className="m-0 text-sm text-muted">{t('monitorForm.flow.noData')}</p>;
  if (!preview && state.fields.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-line-2 p-6">
        <p className="m-0 text-base text-muted">{t('monitorForm.flow.dataNeedsPreview')}</p>
        <Button variant="secondary" onClick={onGoToTarget}>
          {t('monitorForm.flow.back')}
        </Button>
      </div>
    );
  }
  const json = state.type === 'HTTP' ? parseJson(preview?.body) : undefined;
  return (
    <div className="flex flex-col gap-4 rounded-md border border-line bg-s1 p-4">
      {json !== undefined && preview && (
        <details className="group rounded-sm border border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-text">
            {t('monitorForm.data.pickFromBody')}
            <IconChevronDown size={16} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-2 border-t border-line p-3">
            <p className="m-0 text-sm text-muted">{t('monitorForm.data.pickHint')}</p>
            <div className="max-h-72 overflow-auto">
              <JsonExplorer value={json} onPick={(pick) => onChange({ fields: addPickedField(state.fields, pick, preview) })} />
            </div>
          </div>
        </details>
      )}
      <DataDisplayStep fields={state.fields} values={preview?.rows[0]} onChange={(fields) => onChange({ fields })} />
    </div>
  );
}
