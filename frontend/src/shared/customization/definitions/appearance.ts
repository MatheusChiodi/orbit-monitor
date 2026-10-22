import { ANIMATION_LEVELS, DEFAULT_ANIMATION_LEVEL } from '@/shared/motion/animationLevel';
import { DEFAULT_DENSITY, DENSITIES } from '@/shared/preferences/density';
import { defineSetting } from '../define';

/** FE-56: typography, shape and density; FE-06 / FE-07 levels are bridged to the FE-50 device preferences. */
const LOOK = ['workspace', 'device', 'layout'] as const;

export const SANS_FONTS = ['inter', 'inter-tight', 'geist-mono', 'system-sans', 'system-serif'] as const;
export const MONO_FONTS = ['geist-mono', 'system-mono'] as const;

export const APPEARANCE_SETTINGS = [
  defineSetting({ id: 'typography.bodyFont', type: 'font', values: SANS_FONTS, default: 'inter', scopes: LOOK, category: 'typography', label: 'customization.settings.bodyFont', preview: 'TypePreview' }),
  defineSetting({ id: 'typography.displayFont', type: 'font', values: SANS_FONTS, default: 'inter-tight', scopes: LOOK, category: 'typography', label: 'customization.settings.displayFont', preview: 'TypePreview' }),
  defineSetting({ id: 'typography.monoFont', type: 'font', values: MONO_FONTS, default: 'geist-mono', scopes: LOOK, category: 'typography', label: 'customization.settings.monoFont', preview: 'TypePreview' }),
  // Console base size in px. The floor of 13 px is the minimum text size of the contrast guard (FE-02).
  defineSetting({ id: 'typography.baseSize', type: 'number', min: 13, max: 20, step: 1, unit: 'px', default: 15, scopes: LOOK, category: 'typography', label: 'customization.settings.baseSize', description: 'customization.settings.baseSizeHint' }),
  defineSetting({ id: 'typography.scale', type: 'number', min: 0.9, max: 1.4, step: 0.05, unit: '×', default: 1, scopes: LOOK, category: 'typography', label: 'customization.settings.scale', description: 'customization.settings.scaleHint' }),
  defineSetting({ id: 'typography.weight', type: 'enum', values: ['regular', 'medium'], default: 'regular', scopes: LOOK, category: 'typography', label: 'customization.settings.weight' }),
  defineSetting({ id: 'typography.letterSpacing', type: 'enum', values: ['tight', 'normal', 'wide'], default: 'normal', scopes: LOOK, category: 'typography', label: 'customization.settings.letterSpacing' }),
  defineSetting({ id: 'typography.monoValues', type: 'boolean', default: true, scopes: LOOK, category: 'typography', label: 'customization.settings.monoValues' }),
  defineSetting({ id: 'shape.radius', type: 'enum', values: ['sharp', 'default', 'round'], default: 'default', scopes: LOOK, category: 'shape', label: 'customization.settings.radius' }),
  defineSetting({ id: 'shape.borderWidth', type: 'enum', values: ['thin', 'thick'], default: 'thin', scopes: LOOK, category: 'shape', label: 'customization.settings.borderWidth' }),
  defineSetting({ id: 'shape.glass', type: 'boolean', default: true, scopes: LOOK, category: 'shape', label: 'customization.settings.glass' }),
  defineSetting({ id: 'shape.surfaces', type: 'enum', values: ['layered', 'flat'], default: 'layered', scopes: LOOK, category: 'shape', label: 'customization.settings.surfaces' }),
  defineSetting({ id: 'shape.shadows', type: 'boolean', default: false, scopes: LOOK, category: 'shape', label: 'customization.settings.shadows' }),
  defineSetting({ id: 'density.level', type: 'enum', values: DENSITIES, default: DEFAULT_DENSITY, scopes: LOOK, category: 'density', label: 'customization.settings.density' }),
  defineSetting({ id: 'density.panelPadding', type: 'enum', values: ['tight', 'normal', 'roomy'], default: 'normal', scopes: LOOK, category: 'density', label: 'customization.settings.panelPadding' }),
  defineSetting({ id: 'motion.level', type: 'enum', values: ANIMATION_LEVELS, default: DEFAULT_ANIMATION_LEVEL, scopes: LOOK, category: 'motion', label: 'customization.settings.motionLevel', description: 'customization.settings.motionHint' }),
];

/** Settings whose device value lives in the FE-50 preferences (one source of truth per device). */
export const PREFERENCE_BRIDGES = { 'density.level': 'density', 'motion.level': 'animation' } as const;
