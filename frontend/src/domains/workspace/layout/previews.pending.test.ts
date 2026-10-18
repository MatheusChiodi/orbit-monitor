import { describe, expect, it } from 'vitest';
import { SCREEN_PRESETS, previewScale, rootFontSize } from './previews';

describe('FE-18 screen previews (pure)', () => {
  it('offers 1080p, 4K, ultrawide and portrait frames', () => {
    expect(SCREEN_PRESETS.map((p) => [p.id, p.width, p.height])).toEqual([
      ['1080p', 1920, 1080],
      ['4k', 3840, 2160],
      ['ultrawide', 3440, 1440],
      ['portrait', 1080, 1920],
    ]);
  });

  it('the root font follows the fluid base clamp(12px, .7vw + .45vh, 36px)', () => {
    expect(rootFontSize(1920, 1080)).toBeCloseTo(18.3, 1);
    expect(rootFontSize(3840, 2160)).toBe(36);
    expect(rootFontSize(320, 480)).toBe(12);
  });

  it('scales a frame to fit the available box keeping the aspect ratio', () => {
    expect(previewScale({ width: 1920, height: 1080 }, { width: 960, height: 900 })).toBeCloseTo(0.5);
    expect(previewScale({ width: 1080, height: 1920 }, { width: 960, height: 960 })).toBeCloseTo(0.5);
  });

  it('never scales up', () => {
    expect(previewScale({ width: 1080, height: 1920 }, { width: 4000, height: 4000 })).toBe(1);
  });
});
