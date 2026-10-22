/** The monitored URL of an HTTP monitor, only when it is plain http(s) (never `javascript:` and the like). */
export function targetUrlOf(definition: Record<string, unknown> | undefined): string | null {
  const url = definition?.url;
  return typeof url === 'string' && /^https?:\/\/\S+$/i.test(url) ? url : null;
}
