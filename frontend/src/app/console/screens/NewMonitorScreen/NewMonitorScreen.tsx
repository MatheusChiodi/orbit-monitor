import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { KindChooser } from '@/domains/monitor/components/KindChooser';
import { MonitorForm } from '@/domains/monitor/components/MonitorForm';
import { duplicateOf, stateFromDefinition, stateFromTemplate, type LoadedMonitor, type MonitorFormState, type MonitorKind } from '@/domains/monitor/form';
import type { MonitorSaveResult } from '@/shared/api/monitorTargets';
import type { MonitorDefinition } from '@/shared/api/types';
import { Button, Card, Field, TextInput } from '@/shared/ui';
import { useConsole } from '../../ConsoleContext';
import { ScreenSkeleton, ScreenStatus, ScreenTitle } from '../ScreenStatus';
import { useMonitorFormServices } from './useMonitorFormServices';
import { withKept } from './withKept';

export interface NewMonitorScreenProps {
  kind?: MonitorKind;
  onSaved: (name: string) => void;
}

function pushUrlOf(result: unknown): string | null {
  return result && typeof result === 'object' && 'pushUrl' in result && typeof result.pushUrl === 'string' ? result.pushUrl : null;
}

/** `#/monitors/new?from=<id>` duplicates a monitor. */
function duplicateFrom(): string | null {
  const query = window.location.hash.split('?')[1];
  return query ? new URLSearchParams(query).get('from') : null;
}

/**
 * Add a monitor (edit mode only; the route falls back to the list otherwise): step 0 chooses the kind or a
 * template, then the guided form. A new push monitor's secret URL is shown once, read-only, kept only in
 * this component's memory (BE-03, CORE-16).
 */
export function NewMonitorScreen({ kind, onSaved }: NewMonitorScreenProps) {
  const { t } = useTranslation();
  const { source, demo, navigate } = useConsole();
  const queryClient = useQueryClient();
  const services = useMonitorFormServices();
  const [from] = useState(duplicateFrom);
  const [template, setTemplate] = useState<MonitorFormState | null>(null);
  const [push, setPush] = useState<{ name: string; url: string } | null>(null);
  const original = useQuery({ queryKey: ['monitor', demo, from], queryFn: () => source.getMonitor(from!), enabled: from !== null });

  const create = useMutation({
    mutationFn: source.createMonitor,
    onSuccess: async (result: unknown, definition: MonitorDefinition) => {
      await queryClient.invalidateQueries({ queryKey: ['monitors', demo] });
      const url = pushUrlOf(result);
      if (url) setPush({ name: definition.name, url });
      else onSaved(definition.name);
    },
  });

  const title = from ? t('monitorForm.flow.duplicateTitle') : t('monitorForm.flow.addTitle');

  if (push) {
    return (
      <>
        <ScreenTitle>{title}</ScreenTitle>
        <Card title={t('console.monitors.saved', { name: push.name })}>
          <Field label={t('monitorForm.pushUrl')}>
            <TextInput readOnly className="font-mono" value={push.url} onFocus={(e) => e.target.select()} />
          </Field>
          <div>
            <Button variant="primary" onClick={() => onSaved(push.name)}>
              {t('screens.done')}
            </Button>
          </div>
        </Card>
      </>
    );
  }

  let duplicate: LoadedMonitor | null = null;
  if (from && original.data) duplicate = duplicateOf(stateFromDefinition(original.data.definition), t('monitorForm.flow.copyOf', { name: original.data.status.name }));

  const save = async (definition: MonitorDefinition): Promise<MonitorSaveResult | void> => {
    await create.mutateAsync(duplicate ? withKept(definition, duplicate) : definition);
  };

  let body;
  if (from && (original.isPending || original.isError)) {
    body = <ScreenStatus pending={original.isPending} error={original.error} onRetry={() => void original.refetch()} rows={4} />;
  } else if (services.loading) {
    body = <ScreenSkeleton rows={4} />;
  } else if (!kind && !template && !duplicate) {
    body = <KindChooser onChoose={(k) => navigate({ name: 'new-monitor', kind: k })} onTemplate={(tpl) => setTemplate(stateFromTemplate(tpl.definition))} />;
  } else {
    const initialState = duplicate?.state ?? template ?? undefined;
    body = (
      <MonitorForm
        key={from ?? (template ? `template-${template.name}` : kind)}
        {...services}
        initialType={kind}
        initialState={initialState}
        keptConditions={duplicate?.keptConditions}
        notice={duplicate ? <p className="m-0 rounded-sm border border-line bg-s1 px-3 py-2 text-sm text-muted">{t('monitorForm.flow.secretsRetype')}</p> : undefined}
        onSave={save}
        onCancel={() => navigate({ name: 'monitors' })}
        onChangeKind={() => {
          setTemplate(null);
          navigate({ name: 'new-monitor' });
        }}
      />
    );
  }

  return (
    <>
      <ScreenTitle description={t('monitorForm.flow.addDescription')}>{title}</ScreenTitle>
      {body}
    </>
  );
}

export default NewMonitorScreen;
