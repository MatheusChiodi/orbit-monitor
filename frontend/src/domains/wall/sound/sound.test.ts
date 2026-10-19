import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SOUND_SETTINGS, SOUND_STORAGE_KEY, createSoundPlayer, loadSoundSettings, saveSoundSettings, shouldPlay } from './sound';

interface FakeNode {
  connect: ReturnType<typeof vi.fn>;
}

function fakeAudioContext() {
  const oscillators: { frequency: { value: number }; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const gains: { gain: { value: number } }[] = [];
  const ctx = {
    currentTime: 0,
    destination: {},
    createOscillator: vi.fn(() => {
      const osc = { frequency: { value: 0 }, type: 'sine', start: vi.fn(), stop: vi.fn(), connect: vi.fn() } as FakeNode & (typeof oscillators)[number];
      oscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => {
      const gain = { gain: { value: 1 }, connect: vi.fn() };
      gains.push(gain);
      return gain;
    }),
  };
  return { ctx, oscillators, gains };
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('FE-47 sound alerts', () => {
  it('muted by default', () => {
    expect(DEFAULT_SOUND_SETTINGS.muted).toBe(true);
    expect(loadSoundSettings()).toEqual(DEFAULT_SOUND_SETTINGS);
  });

  it('plays only for new incidents of an enabled severity while unmuted', () => {
    const settings = { muted: false, volume: 0.5, severities: { DOWN: true, WARN: false } };
    expect(shouldPlay({ kind: 'DOWN' }, settings)).toBe(true);
    expect(shouldPlay({ kind: 'WARN' }, settings)).toBe(false);
    expect(shouldPlay({ kind: 'OK' }, settings)).toBe(false);
    expect(shouldPlay({ kind: 'DOWN' }, { ...settings, muted: true })).toBe(false);
  });

  it('a different tone per severity at the chosen volume', () => {
    const { ctx, oscillators, gains } = fakeAudioContext();
    const player = createSoundPlayer(() => ctx as unknown as AudioContext);
    player.play('DOWN', 0.4);
    player.play('WARN', 0.4);
    expect(oscillators[0]!.frequency.value).not.toBe(oscillators[1]!.frequency.value);
    expect(gains[0]!.gain.value).toBeCloseTo(0.4);
  });

  it('without Web Audio it stays silent instead of throwing', () => {
    const player = createSoundPlayer(() => null);
    expect(() => player.play('DOWN', 1)).not.toThrow();
  });

  it('settings are device preferences (localStorage with try/catch)', () => {
    saveSoundSettings({ muted: false, volume: 0.8, severities: { DOWN: true, WARN: true } });
    expect(JSON.parse(localStorage.getItem(SOUND_STORAGE_KEY)!)).toMatchObject({ muted: false, volume: 0.8 });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadSoundSettings()).toEqual(DEFAULT_SOUND_SETTINGS);
  });

  it('volume is clamped to 0..1', () => {
    saveSoundSettings({ muted: false, volume: 3, severities: { DOWN: true, WARN: true } });
    expect(loadSoundSettings().volume).toBe(1);
  });
});
