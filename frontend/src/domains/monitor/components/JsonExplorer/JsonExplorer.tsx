import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { detectSensitive, safeText } from '@/shared/privacy/redact';
import { SafeValue } from '@/shared/privacy/SafeValue';
import { Badge, Button, IconButton, IconCopy } from '@/shared/ui';
import { jsonFieldType, jsonPathOf, type JsonFieldType, type JsonPathSegment } from './jsonPath';

export interface JsonPick {
  path: string;
  type: JsonFieldType;
}

export interface JsonExplorerProps {
  value: unknown;
  onPick: (pick: JsonPick) => void;
  defaultExpanded?: boolean;
}

type JsonObject = Record<string, unknown>;

function isBranch(value: unknown): value is JsonObject | unknown[] {
  return typeof value === 'object' && value !== null;
}

/** Children of a node; arrays expose their item shape once, with a `[*]` wildcard. */
function children(value: JsonObject | unknown[], path: JsonPathSegment[]): { key: string; value: unknown; path: JsonPathSegment[] }[] {
  if (Array.isArray(value)) {
    const first = value[0];
    if (isBranch(first) && !Array.isArray(first)) {
      return Object.entries(first).map(([key, v]) => ({ key, value: v, path: [...path, '*', key] }));
    }
    return first === undefined ? [] : [{ key: '[*]', value: first, path: [...path, '*'] }];
  }
  return Object.entries(value).map(([key, v]) => ({ key, value: v, path: [...path, key] }));
}

function displayValue(value: unknown): string | number | boolean | null {
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return null;
}

interface NodeProps {
  name: string;
  value: unknown;
  path: JsonPathSegment[];
  expanded: ReadonlySet<string>;
  toggle: (path: string) => void;
  onPick: (pick: JsonPick) => void;
  onKeyDown: (event: KeyboardEvent<HTMLLIElement>, node: { path: string; branch: boolean; pick: JsonPick | null }) => void;
  first: boolean;
}

function Node({ name, value, path, expanded, toggle, onPick, onKeyDown, first }: NodeProps) {
  const { t } = useTranslation();
  const jsonPath = jsonPathOf(path);
  const branch = isBranch(value);
  const open = branch && expanded.has(jsonPath);
  const key = typeof path.at(-1) === 'string' && path.at(-1) !== '*' ? String(path.at(-1)) : name;
  const dataClass = branch ? null : detectSensitive(displayValue(value) === null ? null : (value as string | number | boolean), key);
  const pci = dataClass === 'PCI_PAN' || dataClass === 'PCI_SAD';
  const pick: JsonPick | null = branch || pci ? null : { path: jsonPath, type: jsonFieldType(value) };

  const stop = (event: MouseEvent) => event.stopPropagation();

  return (
    <li
      role="treeitem"
      aria-label={name}
      aria-expanded={branch ? open : undefined}
      tabIndex={first ? 0 : -1}
      data-path={jsonPath}
      onClick={(event) => {
        event.stopPropagation();
        if (branch) toggle(jsonPath);
      }}
      onKeyDown={(event) => onKeyDown(event, { path: jsonPath, branch, pick })}
      className="cursor-default rounded-sm px-1 py-0.5 focus:outline-2 focus:outline-accent"
    >
      <span className="flex flex-wrap items-center gap-2 font-mono text-sm">
        <span aria-hidden>{branch ? (open ? '▾' : '▸') : '·'}</span>
        <span className="text-text">{name}</span>
        {!branch && (
          <>
            <SafeValue value={displayValue(value)} field={key} className="text-muted" />
            {pci && <Badge tone="WARN">{t('explorer.pci')}</Badge>}
            {pick && (
              <Button variant="ghost" size="sm" aria-label={t('monitorForm.data.addValue', { path: jsonPath })} onClick={(e) => { stop(e); onPick(pick); }}>
                {t('monitorForm.data.add')}
              </Button>
            )}
            <IconButton
              size="sm"
              icon={IconCopy}
              label={t('explorer.copy', { path: jsonPath })}
              onClick={(e) => {
                stop(e);
                const text = typeof value === 'string' ? safeText(value, key) : safeText(displayValue(value), key);
                void navigator.clipboard?.writeText(text);
              }}
            />
          </>
        )}
      </span>
      {open && (
        <ul role="group" className="m-0 list-none pl-4">
          {children(value, path).map((child) => (
            <Node key={child.key} name={child.key} value={child.value} path={child.path} expanded={expanded} toggle={toggle} onPick={onPick} onKeyDown={onKeyDown} first={false} />
          ))}
        </ul>
      )}
    </li>
  );
}

function allBranchPaths(value: unknown, path: JsonPathSegment[] = []): string[] {
  if (!isBranch(value)) return [];
  const own = path.length ? [jsonPathOf(path)] : [];
  return [...own, ...children(value, path).flatMap((c) => allBranchPaths(c.value, c.path))];
}

/** FE-35: response body as an accessible tree; click or Enter on a leaf creates a JSONPath field. */
export function JsonExplorer({ value, onPick, defaultExpanded = false }: JsonExplorerProps) {
  const { t } = useTranslation();
  const tree = useRef<HTMLUListElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(defaultExpanded ? allBranchPaths(value) : []));

  if (!isBranch(value)) return <p className="m-0 text-sm text-muted">{t('explorer.empty')}</p>;

  const toggle = (path: string, force?: boolean) =>
    setExpanded((current) => {
      const next = new Set(current);
      const open = force ?? !next.has(path);
      if (open) next.add(path);
      else next.delete(path);
      return next;
    });

  function onKeyDown(event: KeyboardEvent<HTMLLIElement>, node: { path: string; branch: boolean; pick: JsonPick | null }) {
    if (event.target !== event.currentTarget) return;
    const items = Array.from(tree.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? []);
    const index = items.indexOf(event.currentTarget);
    const move = (i: number) => items[Math.max(0, Math.min(items.length - 1, i))]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        move(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (node.branch) toggle(node.path, true);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (node.branch) toggle(node.path, false);
        break;
      case 'Enter':
        event.preventDefault();
        if (node.pick) onPick(node.pick);
        else if (node.branch) toggle(node.path);
        break;
    }
  }

  return (
    <ul ref={tree} role="tree" aria-label={t('explorer.tree')} className="m-0 list-none p-0">
      {children(value, []).map((child, i) => (
        <Node key={child.key} name={child.key} value={child.value} path={child.path} expanded={expanded} toggle={toggle} onPick={onPick} onKeyDown={onKeyDown} first={i === 0} />
      ))}
    </ul>
  );
}
