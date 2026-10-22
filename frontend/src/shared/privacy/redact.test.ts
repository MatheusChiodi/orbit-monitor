import { describe, expect, it } from 'vitest';
import { groupedPan, makeCpf, makePan } from '@/test/sensitive';
import { MASKS, detectSensitive, redact } from './redact';

const pan = makePan();
const last4 = pan.slice(-4);
const maskedPan = `•••• •••• •••• ${last4}`;

describe('CORE-16 PAN detection (Luhn)', () => {
  it('detects a 16-digit PAN with or without separators', () => {
    expect(detectSensitive(pan)).toBe('PCI_PAN');
    expect(detectSensitive(groupedPan(pan, ' '))).toBe('PCI_PAN');
    expect(detectSensitive(groupedPan(pan, '-'))).toBe('PCI_PAN');
  });

  it('detects a PAN stored as a number', () => {
    expect(detectSensitive(Number(pan))).toBe('PCI_PAN');
  });

  it('ignores digit runs that fail Luhn or are out of the 13–19 range', () => {
    const broken = `${pan.slice(0, -1)}${(Number(last4.at(-1)) + 1) % 10}`;
    expect(detectSensitive(broken)).toBeNull();
    expect(detectSensitive('123456789012')).toBeNull();
    expect(detectSensitive('349')).toBeNull();
    expect(detectSensitive('0000000000000000')).toBeNull();
  });

  it('classifies by field name even when the value looks harmless', () => {
    expect(detectSensitive('abc', 'card_number')).toBe('PCI_PAN');
    expect(detectSensitive('abc', 'NUM_CARTAO')).toBe('PCI_PAN');
    expect(detectSensitive('123', 'cvv')).toBe('PCI_SAD');
    expect(detectSensitive('x', 'track2')).toBe('PCI_SAD');
    expect(detectSensitive('1234', 'pin_block')).toBe('PCI_SAD');
    expect(detectSensitive('a', 'email')).toBe('PERSONAL');
    expect(detectSensitive('a', 'api_key')).toBe('SECRET');
  });

  it('plain metrics are not sensitive', () => {
    expect(detectSensitive(347, 'PENDING_QTY')).toBeNull();
    expect(detectSensitive('UP', 'STATUS')).toBeNull();
    expect(detectSensitive(null)).toBeNull();
  });
});

describe('CORE-16 redaction', () => {
  it('PAN keeps at most the last 4 digits and never the first 6', () => {
    const out = redact(groupedPan(pan, '-'));
    expect(out).toBe(maskedPan);
    expect(String(out)).not.toContain(pan.slice(0, 6));
  });

  it('a numeric PAN becomes masked text', () => {
    expect(redact(Number(pan))).toBe(maskedPan);
  });

  it('SAD fields become [REDACTED] with no partial digits', () => {
    expect(redact('123', 'CVV')).toBe('[REDACTED]');
    expect(redact('%B4111^DOE/J^25121010000', 'track1')).toBe('[REDACTED]');
    expect(redact(1234, 'pin')).toBe('[REDACTED]');
  });

  it('CPF keeps only the check digits', () => {
    const cpf = makeCpf();
    expect(redact(cpf)).toBe(`•••.•••.•••-${cpf.slice(-2)}`);
    expect(redact(cpf.replace(/\D/g, ''))).toBe(`•••.•••.•••-${cpf.slice(-2)}`);
  });

  it('an invalid CPF-looking number is left alone', () => {
    expect(redact('111.222.333-00')).toBe('111.222.333-00');
  });

  it('CNPJ is masked when its check digits are valid', () => {
    expect(redact('11.222.333/0001-81')).toBe('••.•••.•••/••••-81');
  });

  it('e-mail keeps the first letter of the user and the domain', () => {
    expect(redact('jane.doe@domain.com')).toBe('j•••@d•••.com');
  });

  it('JWT and Bearer tokens become ••••', () => {
    expect(redact('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc')).toBe(MASKS.secret);
    expect(redact('Bearer abc.def.ghi')).toBe(MASKS.secret);
    expect(redact('s3cr3t', 'password')).toBe(MASKS.secret);
  });

  it('masks a PAN embedded in free text', () => {
    const text = `payment failed for card ${groupedPan(pan)} at 17:04`;
    expect(redact(text)).toBe(`payment failed for card ${maskedPan} at 17:04`);
  });

  it('masks PAN, CPF and e-mail inside a JSON string', () => {
    const cpf = makeCpf();
    const json = JSON.stringify({ card: pan, doc: cpf, contact: 'jane@domain.com', qty: 3 });
    const out = String(redact(json));
    expect(out).not.toContain(pan);
    expect(out).not.toContain(cpf);
    expect(out).toContain(last4);
    expect(out).toContain('"qty":3');
  });

  it('non-sensitive values pass through unchanged (type preserved)', () => {
    expect(redact(347, 'PENDING_QTY')).toBe(347);
    expect(redact('UP')).toBe('UP');
    expect(redact(true)).toBe(true);
    expect(redact(null)).toBeNull();
  });

  it('is idempotent', () => {
    expect(redact(redact(pan))).toBe(maskedPan);
  });
});

describe('CORE-16 wall surface hides personal data', () => {
  it('personal data is removed, not just masked', () => {
    const cpf = makeCpf();
    const out = String(redact(`contact jane.doe@domain.com doc ${cpf}`, undefined, { surface: 'wall' }));
    expect(out).toBe(`contact ${MASKS.hidden} doc ${MASKS.hidden}`);
    expect(redact('Jane Doe', 'customer_name', { surface: 'wall' })).toBe(MASKS.hidden);
  });

  it('card data stays masked the same way', () => {
    expect(redact(pan, undefined, { surface: 'wall' })).toBe(maskedPan);
  });
});

describe('CORE-16 PAN next to other numbers', () => {
  it('masks a PAN preceded or followed by another number', () => {
    expect(redact(`order 7 ${pan} paid`)).toBe(`order 7 ${maskedPan} paid`);
    expect(redact(`${pan} 99`)).toBe(`${maskedPan} 99`);
    expect(redact(`2026-10-17 ${pan} declined`)).toBe(`2026-10-17 ${maskedPan} declined`);
    expect(detectSensitive(`order 7 ${groupedPan(pan)}`)).toBe('PCI_PAN');
  });

  it('masks overlapping Luhn spans together so no digit of the PAN survives', () => {
    const mc = makePan('555555555555444');
    const masked = String(redact(`order 12 ${groupedPan(mc)} paid`));
    expect(masked.replace(/[\s-]/g, '')).not.toContain(mc.slice(0, 12));
    expect(masked).not.toMatch(/5555 5555/);
    expect(masked).toMatch(/^order (12 )?•••• •••• •••• \d{4} paid$/);
  });
});

describe('CORE-16 phones and key=value secrets in free text', () => {
  it('masks Brazilian phone numbers', () => {
    expect(redact('call (11) 98765-4321')).toBe('call (••) •••••-4321');
    expect(detectSensitive('(11) 98765-4321')).toBe('PERSONAL');
    expect(redact('call (11) 98765-4321', undefined, { surface: 'wall' })).toBe('call •••');
  });

  it('masks key=value secrets but keeps ${env:...} references', () => {
    expect(redact('user=core password=hunter2;timeout=5')).toBe('user=core password=••••;timeout=5');
    expect(redact('{"api_key": "abc123"}')).toBe('{"api_key": "••••"}');
    expect(redact('"password": "${env:DB_PASSWORD}"')).toBe('"password": "${env:DB_PASSWORD}"');
    expect(detectSensitive('token=abc123')).toBe('SECRET');
  });
});
