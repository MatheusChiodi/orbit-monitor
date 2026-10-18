import type { ParseKeys, TFunction } from 'i18next';

export type MessageKey = ParseKeys;
export type MessageParams = Record<string, string | number>;

/** Translatable message returned by pure code; the UI renders it with the active locale. */
export interface Message {
  key: MessageKey;
  params?: MessageParams;
}

export function msg(key: MessageKey, params?: MessageParams): Message {
  return params ? { key, params } : { key };
}

export function translate(t: TFunction, message: Message): string {
  return t(message.key, message.params ?? {});
}
