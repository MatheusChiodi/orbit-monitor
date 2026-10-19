import type { Severity, TimelineKind } from '@/shared/api/types';

/** FE-47: per-severity tones, muted by default; settings are a device preference. */
export const SOUND_STORAGE_KEY = 'orbit.sound';

export interface SoundSettings {
  muted: boolean;
  volume: number;
  severities: Record<Severity, boolean>;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = { muted: true, volume: 0.6, severities: { DOWN: true, WARN: false } };

const clamp = (n: number) => Math.min(1, Math.max(0, n));

export function loadSoundSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(SOUND_STORAGE_KEY);
    if (!raw) return DEFAULT_SOUND_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_SOUND_SETTINGS.muted,
      volume: clamp(typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_SOUND_SETTINGS.volume),
      severities: { ...DEFAULT_SOUND_SETTINGS.severities, ...parsed.severities },
    };
  } catch {
    return DEFAULT_SOUND_SETTINGS;
  }
}

export function saveSoundSettings(settings: SoundSettings): void {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify({ ...settings, volume: clamp(settings.volume) }));
  } catch {
    // storage blocked: the choice lasts only for this page
  }
}

/** Plays only for new DOWN/WARN events of an enabled severity while unmuted. */
export function shouldPlay(event: { kind: TimelineKind }, settings: SoundSettings): boolean {
  if (settings.muted) return false;
  if (event.kind !== 'DOWN' && event.kind !== 'WARN') return false;
  return settings.severities[event.kind];
}

const TONE: Record<Severity, number> = { DOWN: 660, WARN: 440 };

function defaultContext(): AudioContext | null {
  return typeof AudioContext === 'function' ? new AudioContext() : null;
}

/** Short Web Audio tones; silent where Web Audio is unavailable. */
export function createSoundPlayer(getContext: () => AudioContext | null = defaultContext) {
  let ctx: AudioContext | null = null;
  return {
    play(severity: Severity, volume: number): void {
      ctx ??= getContext();
      if (!ctx) return;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = TONE[severity];
      gain.gain.value = clamp(volume);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    },
  };
}
