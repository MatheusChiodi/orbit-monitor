import { DEFAULT_ANIMATION_LEVEL, isAnimationLevel, type AnimationLevel } from './animationLevel';

/**
 * FE-06 precedence (docs/05 §1.2), highest first: `prefers-reduced-motion` (applied by
 * `AnimationLevelProvider`) → `?motion=` → wall layout override → device (FE-50) → workspace default.
 */
export type AnimationSource = 'url' | 'layout' | 'device' | 'workspace' | 'default';

export interface AnimationScopes {
  url?: string | null;
  layout?: string | null;
  device?: string | null;
  workspace?: string | null;
}

export function motionFromUrl(search: string): AnimationLevel | null {
  const value = new URLSearchParams(search).get('motion');
  return isAnimationLevel(value) ? value : null;
}

export function resolveAnimationLevel(scopes: AnimationScopes): { level: AnimationLevel; source: AnimationSource } {
  const levels: readonly [AnimationSource, string | null | undefined][] = [
    ['url', scopes.url],
    ['layout', scopes.layout],
    ['device', scopes.device],
    ['workspace', scopes.workspace],
  ];
  for (const [source, value] of levels) if (isAnimationLevel(value)) return { level: value, source };
  return { level: DEFAULT_ANIMATION_LEVEL, source: 'default' };
}
