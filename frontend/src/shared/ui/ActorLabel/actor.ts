import type { TFunction } from 'i18next';

/** What the backend records as the actor of an action: where the request came from, never a person. */
export const CLIENT_KINDS = ['loopback', 'lan', 'unknown'] as const;
export type ClientKind = (typeof CLIENT_KINDS)[number];

export function clientKindOf(actor: string): ClientKind | null {
  return (CLIENT_KINDS as readonly string[]).includes(actor) ? (actor as ClientKind) : null;
}

/** Localized label for a client kind; any other (legacy) value is returned as it is, to be shown through the redactor. */
export function actorText(actor: string, t: TFunction): string {
  const kind = clientKindOf(actor);
  return kind ? t(`actor.${kind}`) : actor;
}
