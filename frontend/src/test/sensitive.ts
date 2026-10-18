/**
 * Test-only builders for sensitive values. Numbers are generated at runtime so no
 * card number or CPF is ever written literally in the repository.
 */

function luhnCheckDigit(body: string): number {
  let sum = 0;
  let double = true;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    let d = Number(body[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return (10 - (sum % 10)) % 10;
}

/** Luhn-valid 16-digit PAN (digits only), built from a test prefix. */
export function makePan(prefix = '411111111111111'): string {
  return `${prefix}${luhnCheckDigit(prefix)}`;
}

/** PAN grouped in blocks of four with the given separator. */
export function groupedPan(pan: string, separator = ' '): string {
  return pan.replace(/(\d{4})(?=\d)/g, `$1${separator}`);
}

function cpfDigit(digits: number[]): number {
  const weightStart = digits.length + 1;
  const sum = digits.reduce((acc, d, i) => acc + d * (weightStart - i), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

/** Valid CPF formatted as `000.000.000-00`, built from a 9-digit base. */
export function makeCpf(base = '123456789'): string {
  const digits = base.split('').map(Number);
  const first = cpfDigit(digits);
  const second = cpfDigit([...digits, first]);
  const all = `${base}${first}${second}`;
  return `${all.slice(0, 3)}.${all.slice(3, 6)}.${all.slice(6, 9)}-${all.slice(9)}`;
}

/** True when `digits` appears (ignoring spaces and hyphens) in any text node or attribute under `root`. */
export function domContains(root: Element, digits: string): boolean {
  const normalize = (s: string) => s.replace(/[\s-]/g, '');
  const target = normalize(digits);
  if (normalize(root.textContent ?? '').includes(target)) return true;
  for (const el of [root, ...Array.from(root.querySelectorAll('*'))]) {
    for (const attr of Array.from(el.attributes)) {
      if (normalize(attr.value).includes(target)) return true;
    }
  }
  return false;
}
