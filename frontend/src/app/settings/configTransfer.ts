import type { ConfigFile, ConfigItem } from '@/shared/api/configResources';

export type ConfigBundle = Partial<Record<string, ConfigFile>>;

const ENV_REF = /^\$\{env:[^}]+\}$/;

function isSecret(value: unknown): boolean {
  if (typeof value === 'string') return ENV_REF.test(value);
  return Boolean(value && typeof value === 'object' && ('enc' in value || 'vault' in value));
}

function stripItem(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripItem);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => !isSecret(v))
        .map(([k, v]) => [k, stripItem(v)]),
    );
  }
  return value;
}

/** Export never carries secrets: encrypted values, `${env:…}` references and vault markers are dropped. */
export function stripSecrets(bundle: ConfigBundle): ConfigBundle {
  return Object.fromEntries(
    Object.entries(bundle).map(([file, content]) => [
      file,
      content ? { version: content.version, items: content.items.map((item) => stripItem(item) as ConfigItem) } : content,
    ]),
  );
}

export interface ConfigDiff {
  file: string;
  added: string[];
  changed: string[];
  removed: string[];
}

/** Dry-run diff shown before an import is applied. */
export function diffConfig(current: ConfigBundle, incoming: ConfigBundle): ConfigDiff[] {
  const files = [...new Set([...Object.keys(current), ...Object.keys(incoming)])].sort();
  const result: ConfigDiff[] = [];
  for (const file of files) {
    const before = new Map((current[file]?.items ?? []).map((item) => [item.id, JSON.stringify(item)]));
    const after = new Map((incoming[file]?.items ?? []).map((item) => [item.id, JSON.stringify(item)]));
    const added = [...after.keys()].filter((id) => !before.has(id));
    const removed = [...before.keys()].filter((id) => !after.has(id));
    const changed = [...after.keys()].filter((id) => before.has(id) && before.get(id) !== after.get(id));
    if (added.length || removed.length || changed.length) result.push({ file, added, changed, removed });
  }
  return result;
}

export function exportFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `orbit-config-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}
