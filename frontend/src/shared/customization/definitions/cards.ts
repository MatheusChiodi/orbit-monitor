import { defineSetting } from '../define';

/** FE-55: card and component behavior, per component type and per instance (docs/07 §1). */
const ALL = ['workspace', 'device', 'layout', 'instance'] as const;
const SHARED = ['workspace', 'device', 'layout'] as const;

export const CARD_ACTIONS = ['open-detail', 'expand', 'acknowledge', 'open-target', 'none'] as const;
export type CardAction = (typeof CARD_ACTIONS)[number];
export const MONITOR_FIELDS = ['status', 'name', 'value', 'type', 'rule'] as const;
export type MonitorField = (typeof MONITOR_FIELDS)[number];
export const CARD_ICONS = ['none', 'database', 'globe', 'server', 'queue', 'payment'] as const;

const monitor = { target: 'card.monitor', category: 'cards' } as const;
const group = { target: 'card.group', category: 'cards' } as const;

export const CARD_SETTINGS = [
  defineSetting({ ...monitor, id: 'card.monitor.variant', type: 'enum', values: ['compact', 'regular', 'detailed'], default: 'regular', scopes: ALL, tab: 'appearance', label: 'customization.settings.variant', preview: 'MonitorCardPreview' }),
  // `status` is required: a state always keeps its text label (docs/07 §7).
  defineSetting({ ...monitor, id: 'card.monitor.fields', type: 'list', values: MONITOR_FIELDS, required: ['status', 'name'], default: MONITOR_FIELDS, scopes: ALL, tab: 'content', label: 'customization.settings.fields', description: 'customization.settings.fieldsHint', preview: 'MonitorCardPreview' }),
  defineSetting({ ...monitor, id: 'card.monitor.title', type: 'text', maxLength: 60, default: '', scopes: ['instance'], tab: 'content', label: 'customization.settings.title', description: 'customization.settings.titleHint' }),
  defineSetting({ ...monitor, id: 'card.monitor.subtitle', type: 'text', maxLength: 80, default: '', scopes: ['instance'], tab: 'content', label: 'customization.settings.subtitle' }),
  defineSetting({ ...monitor, id: 'card.monitor.unit', type: 'text', maxLength: 12, default: '', scopes: ['instance'], tab: 'content', label: 'customization.settings.unit', description: 'customization.settings.unitHint' }),
  defineSetting({ ...monitor, id: 'card.monitor.valueFormat', type: 'enum', values: ['auto', 'integer', 'decimal', 'compact'], default: 'auto', scopes: ALL, tab: 'content', label: 'customization.settings.valueFormat' }),
  defineSetting({ ...monitor, id: 'card.monitor.icon', type: 'enum', values: CARD_ICONS, default: 'none', scopes: ALL, tab: 'appearance', label: 'customization.settings.icon' }),
  defineSetting({ ...monitor, id: 'card.monitor.colorBands', type: 'boolean', default: true, scopes: ALL, tab: 'appearance', label: 'customization.settings.colorBands', description: 'customization.settings.colorBandsHint' }),
  defineSetting({ ...monitor, id: 'card.monitor.clickAction', type: 'action', values: CARD_ACTIONS, default: 'open-detail', scopes: ALL, tab: 'behavior', label: 'customization.settings.clickAction' }),
  defineSetting({ ...monitor, id: 'card.monitor.doubleClickAction', type: 'action', values: CARD_ACTIONS, default: 'none', scopes: ALL, tab: 'behavior', label: 'customization.settings.doubleClickAction' }),
  defineSetting({ ...monitor, id: 'card.monitor.longPressAction', type: 'action', values: CARD_ACTIONS, default: 'none', scopes: ALL, tab: 'behavior', label: 'customization.settings.longPressAction' }),
  defineSetting({ ...monitor, id: 'card.monitor.hover', type: 'enum', values: ['highlight', 'tooltip', 'none'], default: 'highlight', scopes: ALL, tab: 'behavior', label: 'customization.settings.hover' }),
  defineSetting({ ...monitor, id: 'card.monitor.expand', type: 'enum', values: ['inline', 'none'], default: 'inline', scopes: ALL, tab: 'behavior', label: 'customization.settings.expand' }),
  defineSetting({ ...group, id: 'card.group.summary', type: 'boolean', default: true, scopes: ALL, tab: 'content', label: 'customization.settings.groupSummary' }),
  defineSetting({ ...group, id: 'card.group.title', type: 'text', maxLength: 60, default: '', scopes: ['instance'], tab: 'content', label: 'customization.settings.title', description: 'customization.settings.titleHint' }),
  defineSetting({ ...group, id: 'card.group.emptyText', type: 'text', maxLength: 120, default: '', scopes: SHARED, tab: 'content', label: 'customization.settings.emptyText', description: 'customization.settings.emptyTextHint' }),
  defineSetting({ ...group, id: 'card.group.order', type: 'enum', values: ['exceptions-first', 'name', 'severity', 'manual'], default: 'exceptions-first', scopes: ALL, tab: 'behavior', label: 'customization.settings.order' }),
];
