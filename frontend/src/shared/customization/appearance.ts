import { applyDensity, isDensity, type Density } from '@/shared/preferences/density';
import { resolveSetting, type CustomizationLayers } from './resolve';

/** FE-56: resolved look (typography, shape, density) for one root element. */
export interface Appearance {
  bodyFont: string | null;
  displayFont: string | null;
  monoFont: string | null;
  baseSize: number | null;
  scale: number | null;
  weight: string | null;
  letterSpacing: string | null;
  monoValues: boolean;
  radius: string | null;
  border: string | null;
  glass: boolean;
  surfaces: string | null;
  shadows: boolean;
  panelPadding: string | null;
  density: Density;
}

/** Bundled families (`@fontsource`, loaded by theme.css) and system stacks; nothing is fetched at runtime. */
export const FONT_STACKS: Readonly<Record<string, string>> = {
  inter: "'Inter', system-ui, sans-serif",
  'inter-tight': "'Inter Tight', 'Inter', system-ui, sans-serif",
  'geist-mono': "'Geist Mono', ui-monospace, monospace",
  'system-sans': 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  'system-serif': 'ui-serif, Georgia, "Times New Roman", serif',
  'system-mono': 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
};

const DATA_KEYS = ['radius', 'border', 'glass', 'surfaces', 'shadows', 'panelPadding', 'letterSpacing', 'weight', 'monoValues', 'typeBase', 'typeScale'] as const;
const STYLE_KEYS = ['--font-sans', '--font-display', '--font-mono', '--type-base', '--type-scale'] as const;

/** Only values that differ from the product default (`source !== 'default'`) are applied. */
export function appearanceFrom(layers: CustomizationLayers, layoutId: string | null = null): Appearance {
  const get = (id: string) => resolveSetting(id, layers, { layoutId });
  const custom = (id: string): string | null => {
    const r = get(id);
    return r.source === 'default' ? null : String(r.value);
  };
  const number = (id: string): number | null => {
    const r = get(id);
    return r.source === 'default' ? null : Number(r.value);
  };
  const density = get('density.level').value;
  return {
    bodyFont: custom('typography.bodyFont'),
    displayFont: custom('typography.displayFont'),
    monoFont: custom('typography.monoFont'),
    baseSize: number('typography.baseSize'),
    scale: number('typography.scale'),
    weight: custom('typography.weight'),
    letterSpacing: custom('typography.letterSpacing'),
    monoValues: get('typography.monoValues').value !== false,
    radius: custom('shape.radius'),
    border: custom('shape.borderWidth'),
    glass: get('shape.glass').value !== false,
    surfaces: custom('shape.surfaces'),
    shadows: get('shape.shadows').value === true,
    panelPadding: custom('density.panelPadding'),
    density: isDensity(density) ? density : 'comfortable',
  };
}

export function clearAppearance(root: HTMLElement): void {
  for (const key of DATA_KEYS) delete root.dataset[key];
  for (const key of STYLE_KEYS) root.style.removeProperty(key);
}

/** Writes `data-*` attributes and CSS variables read by `customization.css`. */
export function applyAppearance(look: Appearance, root: HTMLElement = document.documentElement): void {
  clearAppearance(root);
  const data = (key: (typeof DATA_KEYS)[number], value: string | null) => {
    if (value !== null) root.dataset[key] = value;
  };
  const font = (name: string, value: string | null) => {
    const stack = value ? FONT_STACKS[value] : undefined;
    if (stack) root.style.setProperty(name, stack);
  };
  font('--font-sans', look.bodyFont);
  font('--font-display', look.displayFont);
  font('--font-mono', look.monoFont);
  if (look.baseSize !== null) {
    root.style.setProperty('--type-base', `${Math.max(13, look.baseSize)}px`);
    data('typeBase', 'true');
  }
  if (look.scale !== null) {
    root.style.setProperty('--type-scale', String(look.scale));
    data('typeScale', 'true');
  }
  data('weight', look.weight);
  data('letterSpacing', look.letterSpacing);
  data('monoValues', look.monoValues ? null : 'off');
  data('radius', look.radius);
  data('border', look.border);
  data('glass', look.glass ? null : 'off');
  data('surfaces', look.surfaces);
  data('shadows', look.shadows ? 'on' : null);
  data('panelPadding', look.panelPadding);
  applyDensity(look.density, root);
}
