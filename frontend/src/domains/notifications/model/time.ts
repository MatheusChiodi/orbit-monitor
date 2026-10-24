/** "in 8 minutes" / "em 2 horas" from now; null when already due. */
export function relativeFromNow(iso: string, locale: string, now: number = Date.now()): string | null {
  const ms = Date.parse(iso) - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.ceil(ms / 60_000);
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
  if (minutes < 60) return format.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  return hours < 48 ? format.format(hours, 'hour') : format.format(Math.round(hours / 24), 'day');
}

/** Short local date and time ("Oct 24, 14:00"). */
export function shortDateTime(iso: string | null, locale: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

/** ISO instant → value of `<input type="datetime-local">` in local time. */
export function toLocalInput(iso: string | null | undefined): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `<input type="datetime-local">` value (local time) → ISO instant; null when empty or invalid. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
