type Definition = Record<string, unknown>;

/** Whether a saved definition (`GET /api/monitors/{id}`) is paused. */
export function isPaused(definition: Definition | undefined): boolean {
  return definition?.paused === true;
}

/** The id of a saved monitor: the monitor endpoints answer with the detail (`{ definition: { id } }`). */
export function savedMonitorId(response: unknown): string | null {
  const record = response && typeof response === 'object' ? (response as Record<string, unknown>) : {};
  const definition = record.definition && typeof record.definition === 'object' ? (record.definition as Record<string, unknown>) : record;
  return typeof definition.id === 'string' ? definition.id : null;
}

/** `GET /api/history/{id}/export`: the monitor's history in the period as CSV (a plain download link). */
export function historyExportHref(monitorId: string, range: { from: Date; to: Date }): string {
  const query = new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString(), format: 'csv' });
  return `/api/history/${encodeURIComponent(monitorId)}/export?${query}`;
}
