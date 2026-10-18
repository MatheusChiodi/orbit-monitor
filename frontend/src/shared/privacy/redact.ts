/**
 * Frontend defense in depth for LGPD / PCI DSS (docs/04-data-protection.md).
 * The backend already redacts at the probe boundary; this re-applies the same detectors
 * before any probe value reaches the DOM. A full card number is never displayed.
 */

export type DataClass = 'PCI_PAN' | 'PCI_SAD' | 'PERSONAL' | 'SECRET';

export const MASKS = {
  sad: '[REDACTED]',
  secret: '••••',
  pan: (last4: string) => `•••• •••• •••• ${last4}`,
  cpf: (checkDigits: string) => `•••.•••.•••-${checkDigits}`,
  cnpj: (checkDigits: string) => `••.•••.•••/••••-${checkDigits}`,
  /** Personal data on the wall is removed, not just masked. */
  hidden: '•••',
} as const;

export interface RedactOptions {
  /** `wall`: personal data is hidden entirely (docs/04-data-protection.md §5). */
  surface?: 'wall' | 'console';
}

/** Splits `cardNumber`, `NUM_CARTAO`, `api-key` into lowercase tokens plus adjacent pairs. */
function nameTokens(field: string): Set<string> {
  const words = field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const tokens = new Set(words);
  for (let i = 0; i < words.length - 1; i += 1) tokens.add(`${words[i]}_${words[i + 1]}`);
  tokens.add(words.join('_'));
  return tokens;
}

const SAD_NAMES = ['cvv', 'cvc', 'cvv2', 'cvc2', 'cid', 'track', 'track1', 'track2', 'pin', 'pin_block', 'pinblock'];
const PAN_NAMES = ['card', 'pan', 'card_number', 'cardnumber', 'cartao', 'num_cartao', 'numero_cartao'];
const SECRET_NAMES = ['password', 'passwd', 'senha', 'secret', 'token', 'api_key', 'apikey', 'authorization'];
const PERSONAL_NAMES = ['cpf', 'cnpj', 'email', 'e_mail', 'phone', 'telefone', 'celular', 'nome', 'name', 'address', 'endereco'];

/** Classifies a field by its name only. */
export function classifyFieldName(field: string): DataClass | null {
  const tokens = nameTokens(field);
  const has = (names: readonly string[]) => names.some((n) => tokens.has(n));
  if (has(SAD_NAMES)) return 'PCI_SAD';
  if (has(PAN_NAMES)) return 'PCI_PAN';
  if (has(SECRET_NAMES)) return 'SECRET';
  if (has(PERSONAL_NAMES)) return 'PERSONAL';
  return null;
}

function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function isPan(digits: string): boolean {
  return digits.length >= 13 && digits.length <= 19 && !/^0+$/.test(digits) && luhnValid(digits);
}

function cpfValid(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(digits[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
}

function cnpjValid(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const check = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return check(12) === Number(digits[12]) && check(13) === Number(digits[13]);
}

const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]*/g;
const BEARER = /\bBearer\s+[\w\-.~+/]+=*/gi;
const PAN_RUN = /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g;
const CNPJ = /(?<!\d)\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}(?!\d)/g;
const CPF = /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g;
const EMAIL = /\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9])[A-Za-z0-9-]*(?:\.[A-Za-z0-9-]+)*\.([A-Za-z]{2,})\b/g;

function onlyDigits(text: string): string {
  return text.replace(/\D/g, '');
}

/** Masks every sensitive pattern found in free text (also JSON strings). */
function redactText(text: string, hidePersonal = false): string {
  return text
    .replace(JWT, MASKS.secret)
    .replace(BEARER, MASKS.secret)
    .replace(PAN_RUN, (run) => {
      const digits = onlyDigits(run);
      return isPan(digits) ? MASKS.pan(digits.slice(-4)) : run;
    })
    .replace(CNPJ, (run) => {
      const digits = onlyDigits(run);
      return cnpjValid(digits) ? (hidePersonal ? MASKS.hidden : MASKS.cnpj(digits.slice(-2))) : run;
    })
    .replace(CPF, (run) => {
      const digits = onlyDigits(run);
      return cpfValid(digits) ? (hidePersonal ? MASKS.hidden : MASKS.cpf(digits.slice(-2))) : run;
    })
    .replace(EMAIL, (_m, user: string, domain: string, tld: string) =>
      hidePersonal ? MASKS.hidden : `${user}•••@${domain}•••.${tld}`,
    );
}

function classifyValue(value: string): DataClass | null {
  if (new RegExp(JWT.source).test(value) || new RegExp(BEARER.source, 'i').test(value)) return 'SECRET';
  for (const run of value.match(PAN_RUN) ?? []) if (isPan(onlyDigits(run))) return 'PCI_PAN';
  for (const run of value.match(CNPJ) ?? []) if (cnpjValid(onlyDigits(run))) return 'PERSONAL';
  for (const run of value.match(CPF) ?? []) if (cpfValid(onlyDigits(run))) return 'PERSONAL';
  if (new RegExp(EMAIL.source).test(value)) return 'PERSONAL';
  return null;
}

export type ProbeValue = string | number | boolean | null | undefined;

/** Classifies a value by field name and content; either match classifies it. */
export function detectSensitive(value: ProbeValue, field?: string): DataClass | null {
  const byName = field ? classifyFieldName(field) : null;
  if (byName) return byName;
  if (typeof value === 'number') return classifyValue(String(value));
  if (typeof value === 'string') return classifyValue(value);
  return null;
}

/** Returns the value safe to display. Non-sensitive values keep their type. */
export function redact<T extends ProbeValue>(value: T, field?: string, options: RedactOptions = {}): T | string {
  const hidePersonal = options.surface === 'wall';
  if (value === null || value === undefined || typeof value === 'boolean') return value;
  const byName = field ? classifyFieldName(field) : null;
  if (byName === 'PCI_SAD') return MASKS.sad;
  if (byName === 'SECRET') return MASKS.secret;
  const text = String(value);
  const masked = redactText(text, hidePersonal);
  if (byName === 'PCI_PAN' && masked === text) {
    const digits = onlyDigits(text);
    return digits.length >= 4 ? MASKS.pan(digits.slice(-4)) : MASKS.secret;
  }
  if (byName === 'PERSONAL') {
    if (hidePersonal) return MASKS.hidden;
    if (masked === text) return text.length > 0 ? `${text[0]}•••` : text;
  }
  if (masked === text) return value;
  return masked;
}

/** Redacted text for attributes (`title`, `aria-label`) and plain strings. */
export function safeText(value: ProbeValue, field?: string, options: RedactOptions = {}): string {
  if (value === null || value === undefined) return '';
  return String(redact(value, field, options));
}
