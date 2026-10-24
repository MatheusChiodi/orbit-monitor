import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { BulkMonitorAction } from '@/shared/api/consoleTypes';
import { useToast } from '@/shared/ui';
import { useConsole } from '../../ConsoleContext';
import { savedMonitorId } from './monitorActions';

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Monitor actions shared by the list rows, the bulk bar and the detail header. Each one calls its
 * endpoint (pause, resume, duplicate, run, delete, bulk), refreshes the lists and says how it went in a
 * toast whose verb matches the action. They resolve to `true` when the server accepted the action.
 */
export function useMonitorActions() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { source, demo, navigate } = useConsole();
  const queryClient = useQueryClient();

  const refresh = async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: ['monitors', demo] });
    await queryClient.invalidateQueries({ queryKey: ['groups', demo] });
    if (id) await queryClient.invalidateQueries({ queryKey: ['monitor', demo, id] });
  };

  async function attempt(action: () => Promise<unknown>, done: string, id?: string): Promise<boolean> {
    try {
      await action();
      toast({ title: done, tone: 'OK' });
      await refresh(id);
      return true;
    } catch (error) {
      toast({ title: reason(error), tone: 'DOWN' });
      return false;
    }
  }

  return {
    setPaused: (id: string, paused: boolean) =>
      attempt(() => (paused ? source.pauseMonitor(id) : source.resumeMonitor(id)), t(paused ? 'ops.detail.pausedToast' : 'ops.detail.resumedToast'), id),

    /** The copy opens in Edit, where its name and settings can be changed. */
    duplicate: async (id: string) => {
      try {
        const copy = savedMonitorId(await source.duplicateMonitor(id));
        toast({ title: t('ops.detail.duplicatedToast'), tone: 'OK' });
        await refresh();
        navigate(copy ? { name: 'edit-monitor', id: copy } : { name: 'monitors' });
        return true;
      } catch (error) {
        toast({ title: reason(error), tone: 'DOWN' });
        return false;
      }
    },

    run: async (id: string) => {
      toast({ title: t('ops.detail.runStarted') });
      try {
        const result = await source.runMonitor(id);
        const state = result.state === 'OK' || result.state === 'WARN' || result.state === 'DOWN' ? result.state : 'neutral';
        toast({ title: t('ops.detail.runDone', { state: t(`ui.status.${state}`) }), tone: state === 'neutral' ? undefined : state });
        await refresh(id);
        return true;
      } catch (error) {
        toast({ title: reason(error), tone: 'DOWN' });
        return false;
      }
    },

    remove: (id: string) => attempt(() => source.deleteMonitor(id), t('ops.detail.deletedToast'), id),

    move: (ids: string[], groupId: string) =>
      bulk(ids, 'move', groupId),

    bulk,
  };

  async function bulk(ids: string[], action: BulkMonitorAction, groupId?: string): Promise<boolean> {
    try {
      const { results } = await source.bulkMonitors(ids, action, groupId);
      const failed = results.filter((r) => !r.ok).length;
      const done = { pause: 'paused', resume: 'resumed', delete: 'deleted', move: 'moved' } as const;
      toast(
        failed
          ? { title: t('ops.monitors.bulk.partial', { failed, count: ids.length }), tone: 'WARN' }
          : { title: t(`ops.monitors.bulk.${done[action]}`, { count: ids.length }), tone: 'OK' },
      );
      await refresh();
      return failed === 0;
    } catch (error) {
      toast({ title: reason(error), tone: 'DOWN' });
      return false;
    }
  }
}
