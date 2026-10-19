/** A 30-minute cell of the week grid: `day` 0 = weekStart (Monday), `slot` 0..47. */
export interface SlotRef {
  day: number;
  slot: number;
}

export const SLOT_MINUTES = 30;
export const SLOTS_PER_DAY = 48;

function slotIndex(ref: SlotRef): number {
  return ref.day * SLOTS_PER_DAY + ref.slot;
}

export function slotStart(weekStart: Date, index: number): Date {
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + Math.floor(index / SLOTS_PER_DAY));
  date.setHours(0, (index % SLOTS_PER_DAY) * SLOT_MINUTES, 0, 0);
  return date;
}

/** Range covered by two cells, regardless of drag direction (end = end of the last cell). */
export function slotRange(weekStart: Date, a: SlotRef, b: SlotRef): { start: string; end: string } {
  const from = Math.min(slotIndex(a), slotIndex(b));
  const to = Math.max(slotIndex(a), slotIndex(b)) + 1;
  return { start: slotStart(weekStart, from).toISOString(), end: slotStart(weekStart, to).toISOString() };
}
