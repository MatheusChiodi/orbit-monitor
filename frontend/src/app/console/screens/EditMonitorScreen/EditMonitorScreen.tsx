import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MonitorForm } from '@/domains/monitor/components/MonitorForm';
import { stateFromDefinition } from '@/domains/monitor/form';
import type { MonitorDefinition } from '@/shared/api/types';
import { useToast } from '@/shared/ui';
import { useConsole } from '../../ConsoleContext';
import { ScreenSkeleton, ScreenStatus, ScreenTitle } from '../ScreenStatus';
import { useMonitorFormServices } from '../NewMonitorScreen/useMonitorFormServices';
import { withKept } from '../NewMonitorScreen/withKept';

export interface EditMonitorScreenProps {
  id: string;
}

/** `#/monitors/:id/edit`: the saved monitor in the guided form; "Save changes" returns to its page. */
export default function EditMonitorScreen({ id }: EditMonitorScreenProps) {
  const { t } = useTranslation();
  const { source, demo, navigate, editable } = useConsole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const services = useMonitorFormServices();
  const monitor = useQuery({ queryKey: ['monitor', demo, id], queryFn: () => source.getMonitor(id) });
  const loaded = monitor.data ? stateFromDefinition(monitor.data.definition) : null;

  const save = useMutation({
    mutationFn: source.createMonitor,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['monitors', demo] }),
        queryClient.invalidateQueries({ queryKey: ['monitor', demo, id] }),
      ]);
      toast({ title: t('monitorForm.flow.changesSaved'), tone: 'OK' });
      navigate({ name: 'monitor', id });
    },
  });

  const back = () => navigate({ name: 'monitor', id });
  let body;
  if (!editable) body = <p className="m-0 text-base text-muted">{t('monitorForm.connections.readOnly')}</p>;
  else if (monitor.isPending || monitor.isError) body = <ScreenStatus pending={monitor.isPending} error={monitor.error} onRetry={() => void monitor.refetch()} rows={4} />;
  else if (services.loading || !loaded) body = <ScreenSkeleton rows={4} />;
  else {
    body = (
      <MonitorForm
        key={id}
        {...services}
        mode="edit"
        initialState={loaded.state}
        keptConditions={loaded.keptConditions}
        onSave={async (definition: MonitorDefinition) => {
          await save.mutateAsync(withKept(definition, loaded));
        }}
        onCancel={back}
      />
    );
  }

  return (
    <>
      <ScreenTitle description={monitor.data?.status.name}>{t('monitorForm.flow.editTitle')}</ScreenTitle>
      {body}
    </>
  );
}

export { EditMonitorScreen };
