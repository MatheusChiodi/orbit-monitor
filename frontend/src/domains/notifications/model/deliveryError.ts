import type { TFunction } from 'i18next';

export type DeliveryProblem = 'refused' | 'unknownHost' | 'timeout' | 'tls' | 'auth' | 'http' | 'other';

export interface DescribedError {
  problem: DeliveryProblem;
  /** HTTP status when the provider answered one. */
  status?: number;
}

/** Turns a provider/Java error (already masked by the server) into a plain reason the operator can act on. */
export function describeDeliveryError(raw: string | null | undefined): DescribedError {
  const text = raw ?? '';
  const status = /\b(?:HTTP|status)\D{0,3}([1-5]\d\d)\b/i.exec(text)?.[1];
  if (status === '401' || status === '403' || /authenticat|unauthori[sz]ed|forbidden|535/i.test(text)) return { problem: 'auth', status: status ? Number(status) : undefined };
  if (status) return { problem: 'http', status: Number(status) };
  if (/ConnectException|Connection refused|NoRouteToHost|ConnectionReset/i.test(text)) return { problem: 'refused' };
  if (/UnknownHost|Name or service not known|nodename/i.test(text)) return { problem: 'unknownHost' };
  if (/timed? ?out|Timeout/i.test(text)) return { problem: 'timeout' };
  if (/SSL|TLS|certificate|PKIX|handshake/i.test(text)) return { problem: 'tls' };
  return { problem: 'other' };
}

/** The plain reason in the operator's language; unknown errors are shown as the server sent them (masked). */
export function deliveryErrorText(t: TFunction, raw: string | null | undefined): string {
  const { problem, status } = describeDeliveryError(raw);
  return t(`notificationSettings.problems.${problem}`, { status, raw: raw ?? '' });
}
