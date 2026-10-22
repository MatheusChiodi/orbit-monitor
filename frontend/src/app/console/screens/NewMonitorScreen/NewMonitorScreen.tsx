import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MonitorForm } from '@/domains/monitor/components/MonitorForm';
import type { MonitorKind } from '@/domains/monitor/form';
import type { MonitorSaveResult } from '@/shared/api/monitorTargets';
import type { MonitorDefinition } from '@/shared/api/types';
import { Button, INPUT_CLASS, LABEL_CLASS, Panel } from '@/shared/ui';
import { useConsole, useGroups } from '../../ConsoleContext';
import { ScreenTitle } from '../ScreenStatus';

export interface NewMonitorScreenProps {
  kind?: MonitorKind;
  onSaved: (name: string) => void;
}

function pushUrlOf(result: unknown): string | null {
  return result && typeof result === 'object' && 'pushUrl' in result && typeof result.pushUrl === 'string' ? result.pushUrl : null;
}

/**
 * New monitor form (edit mode only; the route falls back to the list otherwise). A new push monitor's
 * secret URL is shown once, read-only, kept only in this component's memory (BE-03, CORE-16).
 */
export function NewMonitorScreen({ kind, onSaved }: NewMonitorScreenProps) {
  const { t } = useTranslation();
  const { source, demo, navigate } = useConsole();
  const queryClient = useQueryClient();
  const groups = useGroups();
  const connections = useQuery({ queryKey: ['connections', demo], queryFn: source.listConnections });
  const [push, setPush] = useState<{ name: string; url: string } | null>(null);

  const create = useMutation({
    mutationFn: source.createMonitor,
    onSuccess: async (result, definition: MonitorDefinition) => {
      await queryClient.invalidateQueries({ queryKey: ['monitors', demo] });
      const url = pushUrlOf(result);
      if (url) setPush({ name: definition.name, url });
      else onSaved(definition.name);
    },
  });

  if (push) {
    return (
      <>
        <ScreenTitle>{t('console.monitors.newTitle')}</ScreenTitle>
        <Panel title={t('console.monitors.saved', { name: push.name })}>
          <div className={LABEL_CLASS}>
            <label htmlFor="push-url">{t('monitorForm.pushUrl')}</label>
            <input id="push-url" readOnly className={`${INPUT_CLASS} font-mono`} value={push.url} onFocus={(e) => e.target.select()} />
          </div>
          <div className="mt-[0.8rem]">
            <Button variant="primary" onClick={() => onSaved(push.name)}>
              {t('screens.done')}
            </Button>
          </div>
        </Panel>
      </>
    );
  }

  return (
    <>
      <ScreenTitle>{t('console.monitors.newTitle')}</ScreenTitle>
      <MonitorForm
        key={kind ?? 'SQL'}
        initialType={kind}
        groups={groups.data ?? []}
        connections={connections.data ?? []}
        onPreview={source.previewMonitor}
        onLoadCatalog={source.getCatalog}
        onSave={async (definition): Promise<MonitorSaveResult | void> => {
          await create.mutateAsync(definition);
        }}
        onCancel={() => navigate({ name: 'monitors' })}
      />
    </>
  );
}
