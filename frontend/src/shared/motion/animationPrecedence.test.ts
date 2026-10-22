import { describe, expect, it } from 'vitest';
import { motionFromUrl, resolveAnimationLevel } from './animationPrecedence';

describe('FE-06 animation precedence', () => {
  it('reads `?motion=` and ignores unknown values', () => {
    expect(motionFromUrl('?motion=off')).toBe('off');
    expect(motionFromUrl('?motion=expressive&theme=nord')).toBe('expressive');
    expect(motionFromUrl('?motion=wild')).toBeNull();
    expect(motionFromUrl('')).toBeNull();
  });

  it('URL → wall layout override → device → workspace default → standard', () => {
    const all = { url: 'off', layout: 'minimal', device: 'expressive', workspace: 'standard' } as const;
    expect(resolveAnimationLevel(all)).toEqual({ level: 'off', source: 'url' });
    expect(resolveAnimationLevel({ ...all, url: null })).toEqual({ level: 'minimal', source: 'layout' });
    expect(resolveAnimationLevel({ ...all, url: null, layout: null })).toEqual({ level: 'expressive', source: 'device' });
    expect(resolveAnimationLevel({ workspace: 'minimal' })).toEqual({ level: 'minimal', source: 'workspace' });
    expect(resolveAnimationLevel({})).toEqual({ level: 'standard', source: 'default' });
  });

  it('invalid values at a level fall through', () => {
    expect(resolveAnimationLevel({ layout: 'loud', device: 'minimal' })).toEqual({ level: 'minimal', source: 'device' });
  });
});
