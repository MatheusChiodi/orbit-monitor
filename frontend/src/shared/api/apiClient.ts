import { ApiError, createApiCore, type ApiClientOptions } from './client';
import { createConsoleEndpoints } from './consoleEndpoints';
import type { Connection, Group, MonitorDefinition, MonitorView, PreviewRequest, PreviewResult } from './types';

/** Full console client: the core plus every console endpoint. */
export function createApiClient(options: ApiClientOptions = {}) {
  const { raw, ...core } = createApiCore(options);
  const { request } = core;
  return {
    ...core,
    ...createConsoleEndpoints(request, raw, (error) => error instanceof ApiError && error.status === 404),
    listGroups: () => request<Group[]>('/api/groups'),
    listMonitors: () => request<MonitorView[]>('/api/monitors'),
    listConnections: () => request<Connection[]>('/api/connections'),
    createMonitor: (definition: MonitorDefinition) =>
      request<MonitorDefinition>('/api/monitors', { method: 'POST', body: definition }),
    previewMonitor: (target: PreviewRequest) =>
      request<PreviewResult>('/api/monitors/preview', { method: 'POST', body: target }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
