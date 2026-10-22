import type { MessageKey } from '@/shared/i18n/message';

/**
 * CORE-21 (docs/07 §2–3): every customizable thing is declared once with a schema.
 * Scopes, highest first: instance > layout > device > workspace > default.
 */
export const SCOPES = ['instance', 'layout', 'device', 'workspace'] as const;
export type Scope = (typeof SCOPES)[number];
/** Scopes stored in `orbit.customization.json` (the device scope stays in browser storage). */
export type ServerScope = Exclude<Scope, 'device'>;
export type ValueSource = Scope | 'draft' | 'default';

export const CATEGORIES = ['typography', 'shape', 'density', 'motion', 'cards', 'behavior'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Inspector tabs of Customize mode (FE-53). */
export const INSPECTOR_TABS = ['content', 'appearance', 'behavior', 'names'] as const;
export type InspectorTab = (typeof INSPECTOR_TABS)[number];

/** Component types that Customize mode can target. */
export const COMPONENT_TYPES = ['card.monitor', 'card.group'] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

export type ObjectValue = Readonly<Record<string, string | number | boolean>>;
export type SettingValue = boolean | number | string | readonly string[] | ObjectValue;
export type SettingValues = Readonly<Record<string, SettingValue>>;

interface BaseSetting {
  id: string;
  scopes: readonly Scope[];
  category: Category;
  label: MessageKey;
  description?: MessageKey;
  /** Component type the setting belongs to (shown in the Customize inspector). */
  target?: ComponentType;
  tab?: InspectorTab;
  /** Name of a preview component in the generated Settings UI. */
  preview?: string;
}

export interface BooleanSetting extends BaseSetting {
  type: 'boolean';
  default: boolean;
}

/** `enum` picks a value, `action` picks a behavior (click, double-click…), `font` a bundled family. */
export interface ChoiceSetting extends BaseSetting {
  type: 'enum' | 'action' | 'font';
  values: readonly string[];
  default: string;
}

export interface NumberSetting extends BaseSetting {
  type: 'number';
  min: number;
  max: number;
  step: number;
  default: number;
  /** Unit shown next to the control (`px`, `×`). */
  unit?: string;
}

export interface ColorSetting extends BaseSetting {
  type: 'color';
  default: string;
}

export interface TextSetting extends BaseSetting {
  type: 'text';
  maxLength: number;
  default: string;
}

/** Ordered subset of `values`; `required` items are always kept (state is never color-only). */
export interface ListSetting extends BaseSetting {
  type: 'list';
  values: readonly string[];
  required?: readonly string[];
  default: readonly string[];
}

export interface ObjectSetting extends BaseSetting {
  type: 'object';
  /** Composed settings: one primitive per key. */
  fields: Readonly<Record<string, 'boolean' | 'number' | 'string'>>;
  default: ObjectValue;
}

export type SettingDefinition = BooleanSetting | ChoiceSetting | NumberSetting | ColorSetting | TextSetting | ListSetting | ObjectSetting;
export type SettingType = SettingDefinition['type'];
