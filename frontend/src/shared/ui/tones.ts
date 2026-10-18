import type { Status } from '@/shared/api/types';

export type Tone = Status | 'INFO' | 'neutral';

/** Static classes per tone (Tailwind needs the full strings). */
export const DOT_CLASS: Record<Tone, string> = {
  OK: 'bg-ok',
  WARN: 'bg-warn',
  DOWN: 'bg-down',
  INFO: 'bg-info',
  neutral: 'bg-muted',
};

export const TEXT_CLASS: Record<Tone, string> = {
  OK: 'text-ok-text',
  WARN: 'text-warn-text',
  DOWN: 'text-down-text',
  INFO: 'text-info',
  neutral: 'text-muted',
};

export const SOFT_CLASS: Record<Tone, string> = {
  OK: 'bg-ok/12 border-ok/50',
  WARN: 'bg-warn/12 border-warn/50',
  DOWN: 'bg-down/14 border-down/60',
  INFO: 'bg-info/12 border-info/50',
  neutral: 'bg-s3 border-line-2',
};

/** State background as a vertical gradient (strong on top, fading at the bottom). */
export const GRADIENT_CLASS: Record<Tone, string> = {
  OK: 'bg-gradient-to-b from-ok/12 to-transparent',
  WARN: 'bg-gradient-to-b from-warn/14 to-transparent',
  DOWN: 'bg-gradient-to-b from-down/16 to-transparent',
  INFO: 'bg-gradient-to-b from-info/12 to-transparent',
  neutral: '',
};

