import { describe, expect, it } from 'vitest';
import { buildDefinition, initialFormState, validateForm, type MonitorFormState } from './form';
import { buildMonitorTarget, conditionFieldsFor, emptyStep, isPreviewable, parseExtract } from './targets';

const state = (patch: Partial<MonitorFormState>): MonitorFormState => ({ ...initialFormState(), name: 'X', groupId: 'g', ...patch });

describe('monitor kinds in the form', () => {
  it('only SQL and HTTP have a live preview', () => {
    expect(['SQL', 'HTTP', 'TCP', 'DNS', 'HTTP_STEPS'].map((t) => isPreviewable(t as MonitorFormState['type']))).toEqual([true, true, false, false, false]);
  });

  it('TCP sends host and numeric port', () => {
    expect(buildMonitorTarget(state({ type: 'TCP', host: ' db.local ', port: '5432' }))).toEqual({ type: 'TCP', host: 'db.local', port: 5432 });
  });

  it('PING sends the host only; PUSH the max silence', () => {
    expect(buildMonitorTarget(state({ type: 'PING', host: 'gw', port: '22' }))).toEqual({ type: 'PING', host: 'gw' });
    expect(buildMonitorTarget(state({ type: 'PUSH', maxSilenceSeconds: 900 }))).toEqual({ type: 'PUSH', maxSilenceSeconds: 900 });
  });

  it('DNS, certificate, gRPC and Kafka targets', () => {
    expect(buildMonitorTarget(state({ type: 'DNS', host: 'orbit.dev', recordType: 'MX', expected: 'mx.orbit.dev' }))).toEqual({
      type: 'DNS', host: 'orbit.dev', recordType: 'MX', expected: 'mx.orbit.dev',
    });
    expect(buildMonitorTarget(state({ type: 'CERT', host: 'portal.example', port: '' }))).toEqual({ type: 'CERT', host: 'portal.example', port: 443 });
    expect(buildMonitorTarget(state({ type: 'GRPC', host: 'svc', port: '50051', service: 'orders', tls: true }))).toEqual({
      type: 'GRPC', host: 'svc', port: 50051, service: 'orders', tls: true,
    });
    expect(buildMonitorTarget(state({ type: 'KAFKA', bootstrapServers: 'k1:9092', consumerGroup: 'billing', topic: '' }))).toEqual({
      type: 'KAFKA', bootstrapServers: 'k1:9092', consumerGroup: 'billing',
    });
  });

  it('HTTP with OAuth2 carries the client credentials; the secret is omitted when left blank', () => {
    const target = buildMonitorTarget(state({ type: 'HTTP', url: 'https://api/x', auth: 'oauth2', tokenUrl: 'https://idp/token', clientId: 'orbit', clientSecret: 's3cret', scope: '' }));
    expect(target).toMatchObject({ type: 'HTTP', auth: { kind: 'oauth2', tokenUrl: 'https://idp/token', clientId: 'orbit', clientSecret: 's3cret' } });
    const kept = buildMonitorTarget(state({ type: 'HTTP', url: 'https://api/x', auth: 'oauth2', tokenUrl: 'https://idp/token', clientId: 'orbit', clientSecret: '' }));
    expect(kept).toMatchObject({ auth: { kind: 'oauth2', clientId: 'orbit' } });
    expect(JSON.stringify(kept)).not.toContain('clientSecret');
  });

  it('multi-step HTTP: steps with headers and JSONPath extraction', () => {
    const target = buildMonitorTarget(
      state({
        type: 'HTTP_STEPS',
        steps: [
          { ...emptyStep(), name: 'login', method: 'POST', url: 'https://api/login', body: '{}', extractText: 'token = $.access_token' },
          { ...emptyStep(), name: 'orders', url: 'https://api/orders', headersText: 'Authorization: Bearer ${login.token}' },
        ],
      }),
    );
    expect(target).toEqual({
      type: 'HTTP_STEPS',
      steps: [
        { name: 'login', method: 'POST', url: 'https://api/login', headers: {}, body: '{}', extract: { token: '$.access_token' } },
        { name: 'orders', method: 'GET', url: 'https://api/orders', headers: { Authorization: 'Bearer ${login.token}' }, extract: {} },
      ],
    });
  });

  it('parseExtract reads "var = $.path" lines and ignores the rest', () => {
    expect(parseExtract('a = $.x\n\nbad line\n b=$.y[0] ')).toEqual({ a: '$.x', b: '$.y[0]' });
  });

  it('validation per kind', () => {
    const keys = (s: MonitorFormState) => validateForm(s).map((m) => m.key);
    expect(keys(state({ type: 'TCP', host: '', port: '70000' }))).toEqual(['monitorForm.errors.hostRequired', 'monitorForm.errors.portRange']);
    expect(keys(state({ type: 'PUSH', maxSilenceSeconds: 10 }))).toEqual(['monitorForm.errors.silenceRange']);
    expect(keys(state({ type: 'KAFKA', bootstrapServers: '', consumerGroup: '' }))).toEqual(['monitorForm.errors.kafkaRequired']);
    expect(keys(state({ type: 'HTTP_STEPS', steps: [{ ...emptyStep(), name: '', url: 'ftp://x' }] }))).toEqual(['monitorForm.errors.stepInvalid']);
    expect(keys(state({ type: 'HTTP', url: 'https://x', auth: 'oauth2', tokenUrl: '', clientId: '' }))).toEqual(['monitorForm.errors.oauthRequired']);
  });

  it('buildDefinition uses the kind target', () => {
    expect(buildDefinition(state({ type: 'PING', host: 'gw' }))).toMatchObject({ name: 'X', type: 'PING', host: 'gw' });
  });

  it('condition fields per kind (placeholders the backend evaluates)', () => {
    expect(conditionFieldsFor('TCP')).toEqual(['[RESPONSE_TIME]', '[CONNECTED]']);
    expect(conditionFieldsFor('CERT')).toEqual(['[CERTIFICATE_EXPIRATION]', '[DOMAIN_EXPIRATION]']);
    expect(conditionFieldsFor('KAFKA')).toEqual(['[LAG]']);
  });
});
