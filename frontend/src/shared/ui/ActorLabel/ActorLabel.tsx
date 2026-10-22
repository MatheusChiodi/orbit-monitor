import { useTranslation } from 'react-i18next';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { clientKindOf } from './actor';

export interface ActorLabelProps {
  /** `loopback`, `lan`, `unknown`, or a legacy value (a name stored by older versions). */
  actor: string;
  className?: string;
}

/** Shows who acted as the client kind ("This machine", "Local network", "Unknown"); legacy values go through SafeValue. */
export function ActorLabel({ actor, className = '' }: ActorLabelProps) {
  const { t } = useTranslation();
  const kind = clientKindOf(actor);
  if (kind) return <span className={className}>{t(`actor.${kind}`)}</span>;
  return <SafeValue value={actor} className={className} />;
}
