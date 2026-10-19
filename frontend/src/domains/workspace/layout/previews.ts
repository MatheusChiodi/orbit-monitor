/** FE-18: screen frames used to preview a wall layout at its real resolution. */
export interface ScreenPreset {
  id: '1080p' | '4k' | 'ultrawide' | 'portrait';
  width: number;
  height: number;
}

export const SCREEN_PRESETS: ScreenPreset[] = [
  { id: '1080p', width: 1920, height: 1080 },
  { id: '4k', width: 3840, height: 2160 },
  { id: 'ultrawide', width: 3440, height: 1440 },
  { id: 'portrait', width: 1080, height: 1920 },
];

/** Same fluid base as the wall: `clamp(12px, .7vw + .45vh, 36px)`. */
export function rootFontSize(width: number, height: number): number {
  const fluid = 0.007 * width + 0.0045 * height;
  return Math.min(36, Math.max(12, fluid));
}

/** Scale that fits a frame inside the available box, keeping the aspect ratio; never above 1. */
export function previewScale(frame: { width: number; height: number }, box: { width: number; height: number }): number {
  return Math.min(1, box.width / frame.width, box.height / frame.height);
}
