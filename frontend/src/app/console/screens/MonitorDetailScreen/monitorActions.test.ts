import { describe, expect, it } from 'vitest';
import { duplicateBody, isPaused, pausedBody, savedMonitorId } from './monitorActions';

const saved = {
  type: 'HTTP',
  id: 'shop',
  name: 'Shop',
  groupId: 'web',
  intervalSeconds: 60,
  timeoutMs: 5000,
  downAfter: 2,
  method: 'GET',
  url: 'https://shop.example.com/health',
  secretHeaders: { Authorization: '•••• (vault)' },
  conditions: [
    { expression: '[STATUS] == 200', level: 'DOWN' },
    { expression: 'some future syntax', level: 'WARN' },
  ],
  fields: [],
  hysteresis: 0.1,
};

describe('monitor pause / resume body', () => {
  it('reads the paused flag', () => {
    expect(isPaused(saved)).toBe(false);
    expect(isPaused({ ...saved, paused: true })).toBe(true);
    expect(isPaused(undefined)).toBe(false);
  });

  it('sends the monitor back with its id, target, extras and every condition, only the flag changed', () => {
    const body = pausedBody(saved, true) as unknown as Record<string, unknown>;
    expect(body).toMatchObject({ id: 'shop', name: 'Shop', groupId: 'web', url: 'https://shop.example.com/health', paused: true, hysteresis: 0.1, timeoutSeconds: 5 });
    expect(JSON.stringify(body.conditions)).toContain('some future syntax');
    expect((body.conditions as unknown[]).length).toBe(2);
    expect(pausedBody({ ...saved, paused: true }, false)).toMatchObject({ paused: false });
  });

  it('a duplicate has no id, a new name, no pause and no masked secret', () => {
    const body = duplicateBody({ ...saved, paused: true }, 'Copy of Shop') as unknown as Record<string, unknown>;
    expect(body.id).toBeUndefined();
    expect(body.paused).toBeUndefined();
    expect(body.name).toBe('Copy of Shop');
    expect(JSON.stringify(body)).not.toContain('••••');
  });

  it('reads the id of the saved monitor from the save response', () => {
    expect(savedMonitorId({ definition: { id: 'http_copy_1a2b3c' } })).toBe('http_copy_1a2b3c');
    expect(savedMonitorId({ id: 'demo' })).toBe('demo');
    expect(savedMonitorId(null)).toBeNull();
  });
});
