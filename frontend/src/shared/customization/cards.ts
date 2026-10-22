import { useMemo, useRef, type HTMLAttributes, type KeyboardEvent } from 'react';
import { useStore } from 'zustand';
import { formatReading } from '@/domains/monitor/rules';
import { sortExceptionsFirst } from '@/domains/monitor/status';
import type { MonitorView } from '@/shared/api/types';
import { formatDecimal, formatInteger } from '@/shared/format';
import type { Locale } from '@/shared/i18n/i18n';
import { detectSensitive, safeText } from '@/shared/privacy/redact';
import { useCustomization } from './CustomizationProvider';
import type { CardAction, MonitorField } from './definitions/cards';

/** FE-55: resolved settings of one monitor card (type + instance scopes). */
export interface MonitorCardSettings {
  variant: 'compact' | 'regular' | 'detailed';
  fields: readonly MonitorField[];
  title: string;
  subtitle: string;
  unit: string;
  valueFormat: 'auto' | 'integer' | 'decimal' | 'compact';
  icon: string;
  colorBands: boolean;
  clickAction: CardAction;
  doubleClickAction: CardAction;
  longPressAction: CardAction;
  hover: 'highlight' | 'tooltip' | 'none';
  expand: 'inline' | 'none';
}

export interface GroupCardSettings {
  summary: boolean;
  title: string;
  emptyText: string;
  order: 'exceptions-first' | 'name' | 'severity' | 'manual';
}

export function monitorInstanceId(id: string): string {
  return `card.monitor:${id}`;
}

export function groupInstanceId(id: string): string {
  return `card.group:${id}`;
}

function useResolvedGroup<T>(prefix: string, keys: readonly string[], instanceId: string | null): T {
  const { store, layoutId } = useCustomization();
  const state = useStore(store);
  return useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const key of keys) out[key] = state.resolve(`${prefix}.${key}`, { instanceId, layoutId }).value;
    return out as T;
  }, [state, prefix, keys, instanceId, layoutId]);
}

const MONITOR_KEYS = ['variant', 'fields', 'title', 'subtitle', 'unit', 'valueFormat', 'icon', 'colorBands', 'clickAction', 'doubleClickAction', 'longPressAction', 'hover', 'expand'] as const;
const GROUP_KEYS = ['summary', 'title', 'emptyText', 'order'] as const;

export function useMonitorCardSettings(monitorId: string | null): MonitorCardSettings {
  return useResolvedGroup<MonitorCardSettings>('card.monitor', MONITOR_KEYS, monitorId ? monitorInstanceId(monitorId) : null);
}

export function useGroupCardSettings(groupId: string | null): GroupCardSettings {
  return useResolvedGroup<GroupCardSettings>('card.group', GROUP_KEYS, groupId ? groupInstanceId(groupId) : null);
}

/** Value text for a card; sensitive-looking numbers stay masked whatever the format (docs/04). */
export function formatCardValue(value: number | null, unit: string | undefined, locale: Locale, format: MonitorCardSettings['valueFormat']): string {
  if (value === null || format === 'auto') return formatReading(value, unit, locale);
  if (detectSensitive(value)) return safeText(value);
  let text: string;
  if (format === 'integer') text = formatInteger(Math.round(value), locale);
  else if (format === 'decimal') text = formatDecimal(value, 2, locale);
  else text = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  if (!unit) return text;
  return unit === '%' ? `${text}%` : `${text} ${unit}`;
}

const SEVERITY: Record<MonitorView['status'], number> = { DOWN: 0, WARN: 1, OK: 2 };

export function orderMonitors(monitors: readonly MonitorView[], order: GroupCardSettings['order']): MonitorView[] {
  switch (order) {
    case 'exceptions-first':
      return sortExceptionsFirst(monitors);
    case 'severity':
      return [...monitors].sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status] || a.name.localeCompare(b.name, 'en'));
    case 'name':
      return [...monitors].sort((a, b) => a.name.localeCompare(b.name, 'en'));
    case 'manual':
      return [...monitors];
  }
}

export type CardActionHandlers = Partial<Record<CardAction, () => void>>;
type ActionSettings = Pick<MonitorCardSettings, 'clickAction' | 'doubleClickAction' | 'longPressAction'>;

const LONG_PRESS_MS = 500;

/** Click / double-click / long-press behavior from the registry; inert when no handler supports the action. */
export function useCardInteractions(settings: ActionSettings, handlers: CardActionHandlers): HTMLAttributes<HTMLElement> {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pick = (action: CardAction) => (action === 'none' ? undefined : handlers[action]);
  const click = pick(settings.clickAction);
  const double = pick(settings.doubleClickAction);
  const long = pick(settings.longPressAction);
  if (!click && !double && !long) return {};
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  return {
    role: 'button',
    tabIndex: 0,
    onClick: click,
    onDoubleClick: double,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      (click ?? double ?? long)?.();
    },
    onPointerDown: long
      ? () => {
          cancel();
          timer.current = setTimeout(long, LONG_PRESS_MS);
        }
      : undefined,
    onPointerUp: long ? cancel : undefined,
    onPointerLeave: long ? cancel : undefined,
  };
}
