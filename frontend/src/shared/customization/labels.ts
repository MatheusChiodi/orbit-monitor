import type { TFunction } from 'i18next';
import type { MessageKey } from '@/shared/i18n/message';
import type { SettingDefinition, ValueSource } from './types';

/** i18n key of an option label (`customization.values.<value>`); the registry test checks both locales. */
export function valueLabelKey(value: string): MessageKey {
  return `customization.values.${value}` as MessageKey;
}

export function settingLabel(t: TFunction, def: SettingDefinition): string {
  return t(def.label);
}

export function valueLabel(t: TFunction, value: string): string {
  return t(valueLabelKey(value));
}

export function sourceLabel(t: TFunction, source: ValueSource): string {
  return t(`customization.scopes.${source}`);
}
