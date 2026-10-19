/** FE-13 / FE-14: pure reordering helpers (monitors, groups, fields, columns). */

/** Moves the item at `from` to `to` (clamped); an invalid source returns a copy unchanged. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= list.length) return next;
  const [item] = next.splice(from, 1);
  const target = Math.max(0, Math.min(to, next.length));
  next.splice(target, 0, item as T);
  return next;
}

export type GroupOrder = Record<string, string[]>;

export interface MoveBetweenGroups {
  monitorId: string;
  from: string;
  to: string;
  index: number;
}

/** Moves a monitor to another group (or within the same one) at a position. */
export function moveBetweenGroups(groups: GroupOrder, move: MoveBetweenGroups): GroupOrder {
  const source = groups[move.from];
  const target = groups[move.to];
  if (!source || !target) return groups;
  const at = source.indexOf(move.monitorId);
  if (at === -1) return groups;
  if (move.from === move.to) return { ...groups, [move.from]: moveItem(source, at, move.index) };
  const without = source.filter((id) => id !== move.monitorId);
  const into = [...target];
  into.splice(Math.max(0, Math.min(move.index, into.length)), 0, move.monitorId);
  return { ...groups, [move.from]: without, [move.to]: into };
}
