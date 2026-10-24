/**
 * FE-52 automatic downgrade, remembered per device: a slow machine starts simplified on the next load
 * instead of stuttering again for 3 s. Storage can be missing or blocked (private mode, kiosk profiles).
 */
const DOWNGRADED = 'orbit.fx.downgraded';
const NOTICED = 'orbit.fx.downgradeNoticed';

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function write(key: string, on: boolean): void {
  try {
    if (on) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    // Not persisted: the downgrade still applies to this page.
  }
}

export function loadDowngraded(): boolean {
  return read(DOWNGRADED);
}

export function saveDowngraded(on: boolean): void {
  write(DOWNGRADED, on);
}

/** The one-time notice was already shown on this device. */
export function downgradeNoticed(): boolean {
  return read(NOTICED);
}

export function markDowngradeNoticed(): void {
  write(NOTICED, true);
}
