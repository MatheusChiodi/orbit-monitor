import type { ReactNode } from 'react';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { AnimationLevelScope, motionPreset, type AnimationLevel } from '@/shared/motion';
import { SafeValue } from '@/shared/privacy';
import { HistoryNotice } from '@/shared/ui/HistoryNotice';
import { StatusPill } from '@/shared/ui/StatusPill';
import type { DisplayModeId } from '../compatibility';
import { toStatus } from '../types';

export interface VizFrameProps {
  mode: DisplayModeId;
  level: AnimationLevel;
  label: string;
  status: string;
  /** Shows "No data yet" instead of the body. */
  empty?: boolean;
  /** Time-based modes always state the in-memory history window. */
  historyHours?: number;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Shared anatomy of every display mode: label, state as text (never color alone), body, history notice.
 * The resolved animation level is exposed as `data-animation` and scoped to the subtree,
 * so shared parts (status pill, value flash, sparkline) follow the mode's level.
 */
export function VizFrame({ mode, level, label, status, empty = false, historyHours, children, footer, className = '' }: VizFrameProps) {
  const { t } = useTranslation();
  const enter = motionPreset(level, 'enter');
  return (
    <AnimationLevelScope level={level}>
      <m.figure
        data-animation={level}
        data-chart={mode}
        initial={enter.initial}
        animate={enter.animate}
        transition={enter.transition}
        className={`m-0 flex min-w-0 flex-col gap-[0.6rem] rounded-[0.9rem] border border-line bg-s1 p-[0.9rem] text-text ${className}`}
      >
        <figcaption className="flex min-w-0 items-center justify-between gap-[0.6rem]">
          <SafeValue value={label} className="truncate font-display text-[0.9rem] font-semibold" />
          <StatusPill status={toStatus(status)} className="shrink-0 text-[0.72rem]" />
        </figcaption>
        {empty ? <p className="m-0 py-[0.8rem] text-center text-[0.85rem] text-muted">{t('viz.noData')}</p> : children}
        {footer}
        {historyHours !== undefined && <HistoryNotice windowHours={historyHours} />}
      </m.figure>
    </AnimationLevelScope>
  );
}
