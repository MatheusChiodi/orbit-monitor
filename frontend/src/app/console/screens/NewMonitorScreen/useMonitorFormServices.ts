import { useQuery, useQueryClient } from '@tanstack/react-query';
import { connectionsKey } from '@/domains/connections/model';
import type { MonitorFormProps } from '@/domains/monitor/components/MonitorForm';
import { useConsole, useGroups } from '../../ConsoleContext';

type Services = Pick<
  MonitorFormProps,
  'groups' | 'connections' | 'onPreview' | 'onLoadCatalog' | 'onLoadSavedQueries' | 'onCreateGroup' | 'onSaveConnection' | 'onTestConnection'
>;

/** What the monitor form needs from the console (live API or demo), shared by the add and edit screens. */
export function useMonitorFormServices(): Services & { loading: boolean } {
  const { source, demo } = useConsole();
  const queryClient = useQueryClient();
  const groups = useGroups();
  const connections = useQuery({ queryKey: connectionsKey(demo), queryFn: source.listConnections });
  return {
    loading: groups.isPending,
    groups: groups.data ?? [],
    connections: connections.data ?? [],
    onPreview: source.previewMonitor,
    onLoadCatalog: source.getCatalog,
    onLoadSavedQueries: source.listSavedQueries,
    onCreateGroup: async (group) => {
      const saved = await source.saveGroup(group);
      await queryClient.invalidateQueries({ queryKey: ['groups', demo] });
      return saved;
    },
    onSaveConnection: async (id, connection) => {
      const saved = await source.saveConnection(id, connection);
      await queryClient.invalidateQueries({ queryKey: connectionsKey(demo) });
      return saved;
    },
    onTestConnection: source.testConnection,
  };
}
