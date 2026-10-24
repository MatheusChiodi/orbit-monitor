import { describe, expect, it } from 'vitest';
import { isPaused, pausedBody } from './monitorActions';

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
});
