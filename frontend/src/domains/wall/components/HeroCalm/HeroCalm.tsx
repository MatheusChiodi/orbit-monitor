import { useTranslation } from 'react-i18next';
import { formatPercent, formatRelative } from '@/shared/format';
import { currentLocale } from '@/shared/i18n/i18n';
import type { Group } from '@/shared/api/types';
import { HeroOrb } from '@/shared/fx/HeroOrb';
import { LivingOrb, type OrbMonitor } from '@/shared/fx/LivingOrb';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import { Panel } from '@/shared/ui';

export interface HeroCalmProps {
  uptime24h: number;
  lastRecoveryAt: string | null;
  nearLimitCount: number;
  now: Date;
  /** FE-59: with the monitors the orb becomes a live map of the system. */
  monitors?: readonly OrbMonitor[];
  groups?: readonly Group[];
}

/** Hero when there is no problem: the living orb (FE-59), or the green circle with slow ripples. */
export function HeroCalm({ uptime24h, lastRecoveryAt, nearLimitCount, now, monitors, groups }: HeroCalmProps) {
  const { t, i18n } = useTranslation();
  const locale = currentLocale(i18n);
  const level = useAnimationLevel();
  // The slow green ring is a documented state signal; it needs at least the standard level.
  const ring = level === 'standard' || level === 'expressive';
  const symbol = (
    <span
      aria-hidden
      data-testid="hero-calm-symbol"
      className="relative inline-flex size-[4.5rem] items-center justify-center"
    >
      {ring && <span className="anim-ring absolute inset-0 rounded-full border-2 border-ok/60" />}
      {ring && <span className="anim-ring absolute inset-0 rounded-full border-2 border-ok/60 [animation-delay:1.3s]" />}
      <span className="size-[2.6rem] rounded-full bg-ok/90" />
    </span>
  );
  return (
    <Panel title={t('wall.hero.title')} tone="OK" live className="h-full pl-[1.25rem]">
      <div className="flex flex-1 flex-col items-center justify-center gap-[1.2rem] py-[1.5rem] text-center">
        {monitors && groups ? (
          <LivingOrb
            monitors={monitors}
            groups={groups}
            uptime24h={uptime24h}
            className="h-[17rem] w-full max-w-[38rem]"
            fallback={symbol}
          />
        ) : (
          <HeroOrb className="h-[14rem] w-[26rem] max-w-full" fallback={symbol} />
        )}
        <h3 className="m-0 font-display text-[2.4rem] font-bold tracking-tight">{t('status.phrase.ok')}</h3>
        <dl className="m-0 grid grid-cols-1 gap-[0.8rem] sm:grid-cols-3">
          <div>
            <dt className="section-label">{t('wall.calm.uptime')}</dt>
            <dd className="m-0 font-mono text-[1.5rem] text-ok-text">{formatPercent(uptime24h, 2, locale)}</dd>
          </div>
          <div>
            <dt className="section-label">{t('wall.calm.lastRecovery')}</dt>
            <dd className="m-0 font-mono text-[1.5rem]">
              {lastRecoveryAt ? formatRelative(lastRecoveryAt, now, locale) : t('wall.calm.none')}
            </dd>
          </div>
          <div>
            <dt className="section-label">{t('wall.calm.nearLimit')}</dt>
            <dd className="m-0 font-mono text-[1.5rem]">{t('wall.calm.monitors', { count: nearLimitCount })}</dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
}
