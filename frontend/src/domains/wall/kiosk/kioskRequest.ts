/** FE-45: `?kiosk=1` asks for kiosk mode (kept apart so the wall loads the kiosk code only then). */
export function isKioskRequested(search: string): boolean {
  return new URLSearchParams(search).get('kiosk') === '1';
}
