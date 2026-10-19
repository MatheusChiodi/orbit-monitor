import { formatReading, ruleText } from '@/domains/monitor/rules';
import type { Incident, MonitorView } from '@/shared/api/types';
import { messages, type Locale } from '@/shared/i18n/i18n';
import { safeText } from '@/shared/privacy/redact';

/** FE-48: opt-in browser notifications for new incidents, remembered on the device. */
export const DESKTOP_NOTIFICATIONS_KEY = 'orbit.desktopNotifications';

function supported(): boolean {
  return typeof Notification === 'function';
}

function remember(on: boolean): void {
  try {
    if (on) localStorage.setItem(DESKTOP_NOTIFICATIONS_KEY, 'on');
    else localStorage.removeItem(DESKTOP_NOTIFICATIONS_KEY);
  } catch {
    // storage blocked: the choice lasts only for this page
  }
}

export function isOptedIn(): boolean {
  try {
    return localStorage.getItem(DESKTOP_NOTIFICATIONS_KEY) === 'on';
  } catch {
    return false;
  }
}

export async function optIn(): Promise<boolean> {
  if (!supported()) return false;
  const granted = (await Notification.requestPermission()) === 'granted';
  remember(granted);
  return granted;
}

export function optOut(): void {
  remember(false);
}

function fill(template: string, params: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => params[key] ?? '');
}

/** One factual, silent notification per new unacknowledged incident (tag = incident id); never card data. */
export function notifyIncident(incident: Incident, monitor: MonitorView, locale: Locale): boolean {
  if (!supported() || !isOptedIn() || Notification.permission !== 'granted' || incident.acknowledgedBy) return false;
  const text = messages(locale);
  const template = incident.severity === 'DOWN' ? text.desktopNotifications.title : text.desktopNotifications.titleWarn;
  const title = fill(template, { name: safeText(monitor.name) });
  const reading = formatReading(monitor.value, undefined, locale);
  const body = monitor.rule
    ? `${monitor.rule.field} = ${reading} · ${fill(text.rule.text, { rule: ruleText(monitor.rule, locale) })}`
    : reading;
  new Notification(title, { body: safeText(body), tag: incident.id, silent: true });
  return true;
}
