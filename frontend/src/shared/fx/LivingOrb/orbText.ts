import type { TFunction } from 'i18next';
import type { OrbModel, OrbStatus } from './orbModel';

/** Text mirror of the orb for `aria-describedby`: "20 monitors in 5 groups, all OK, 1 near threshold". */
export function orbSummary(model: OrbModel, t: TFunction): string {
  const { counts } = model;
  const parts = [`${t('fx.orb.monitors', { count: counts.monitors })} ${t('fx.orb.groups', { count: counts.groups })}`];
  const problems = [
    counts.DOWN > 0 ? t('fx.orb.down', { count: counts.DOWN }) : null,
    counts.WARN > 0 ? t('fx.orb.warn', { count: counts.WARN }) : null,
    counts.UNKNOWN > 0 ? t('fx.orb.unknownCount', { count: counts.UNKNOWN }) : null,
  ].filter((part): part is string => part !== null);
  parts.push(...(problems.length > 0 ? problems : [t('fx.orb.allOk')]));
  if (counts.near > 0) parts.push(t('fx.orb.near', { count: counts.near }));
  return parts.join(', ');
}

export function statusLabel(status: OrbStatus, t: TFunction): string {
  return status === 'UNKNOWN' ? t('fx.orb.unknown') : t(`status.label.${status}`);
}
