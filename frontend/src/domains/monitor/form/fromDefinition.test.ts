import { describe, expect, it } from 'vitest';
import { MONITOR_TEMPLATES } from '../templates';
import { buildDefinition } from './form';
import { duplicateOf, stateFromDefinition, stateFromTemplate } from './fromDefinition';

/** Shape returned by `GET /api/monitors/{id}` (checked against the running server). */
const saved = {
  type: 'HTTP',
  id: 'req_t1_334cca',
  name: 'Checkout API',
  groupId: 'web',
  method: 'GET',
  url: 'https://shop.example/health',
  headers: { Accept: 'application/json' },
  secretHeaders: { Authorization: '•••• (vault)' },
  body: null,
  intervalSeconds: 30,
  timeoutMs: 5000,
  followRedirects: true,
  downAfter: 3,
  hysteresis: 0.1,
  openOnWarn: false,
  conditions: [
    { expression: '[STATUS] between 200 and 299', level: 'DOWN' },
    { expression: '[RESPONSE_TIME] <= 1000', level: 'WARN' },
    { expression: '[BODY].mode == edit', level: 'DOWN' },
    { expression: '[BODY].name contains shop', level: 'WARN' },
  ],
  fields: [{ key: '$.mode', label: 'Mode', format: 'text', unit: null, decimals: null, series: false, display: 'text', masked: false, showOnWall: true }],
  paused: true,
  steps: [],
  oauth: null,
  window: null,
  retry: null,
};

describe('stateFromDefinition', () => {
  it('fills the form from a saved HTTP monitor', () => {
    const { state, extras, keptConditions } = stateFromDefinition(saved);
    expect(state).toMatchObject({ type: 'HTTP', name: 'Checkout API', groupId: 'web', intervalSeconds: 30, timeoutSeconds: 5, retries: 3, url: 'https://shop.example/health' });
    expect(state.headersText).toBe('Accept: application/json\nAuthorization: •••• (vault)');
    expect(state.conditions).toEqual([
      { field: '[STATUS]', operator: 'between', value: '200 and 299', level: 'DOWN' },
      { field: '[RESPONSE_TIME]', operator: '<=', value: '1000', level: 'WARN' },
      { field: '$.mode', operator: '==', value: 'edit', level: 'DOWN' },
    ]);
    expect(keptConditions).toEqual([{ expression: '[BODY].name contains shop', level: 'WARN' }]);
    expect(state.fields[0]).toMatchObject({ field: '$.mode', selected: true, label: 'Mode', storeAsSeries: false });
    expect(extras).toEqual({ id: 'req_t1_334cca', paused: true, hysteresis: 0.1, openOnWarn: false, followRedirects: true });
  });

  it('saves back the same target, keeping the masked secret header', () => {
    const definition = buildDefinition(stateFromDefinition(saved).state);
    expect(definition).toMatchObject({ type: 'HTTP', url: 'https://shop.example/health', headers: { Accept: 'application/json', Authorization: '•••• (vault)' } });
  });

  it('reads SQL and check monitors', () => {
    expect(stateFromDefinition({ type: 'SQL', name: 'Q', connectionId: 'pg', sql: 'SELECT 1', conditions: [{ expression: '[COL].QTY < 200', level: 'DOWN' }] }).state).toMatchObject({
      type: 'SQL',
      connectionId: 'pg',
      sql: 'SELECT 1',
      conditions: [{ field: 'QTY', operator: '<', value: '200', level: 'DOWN' }],
    });
    expect(stateFromDefinition({ type: 'TCP', name: 'DB port', host: 'db', port: 5432 }).state).toMatchObject({ type: 'TCP', host: 'db', port: '5432' });
  });

  it('a duplicate has no id, a new name and no masked secrets', () => {
    const copy = duplicateOf(stateFromDefinition(saved), 'Copy of Checkout API');
    expect(copy.extras.id).toBeUndefined();
    expect(copy.extras.paused).toBeUndefined();
    expect(copy.state.name).toBe('Copy of Checkout API');
    expect(copy.state.headersText).toBe('Accept: application/json');
  });

  it('starts a monitor from a template', () => {
    const state = stateFromTemplate(MONITOR_TEMPLATES[0]!.definition);
    expect(state).toMatchObject({ type: 'HTTP', url: 'http://localhost:8080/actuator/health', headersText: 'Accept: application/json' });
    expect(state.conditions).toHaveLength(3);
  });
});
