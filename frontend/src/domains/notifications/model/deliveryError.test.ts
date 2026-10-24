import { describe, expect, it } from 'vitest';
import { describeDeliveryError } from './deliveryError';

describe('describeDeliveryError', () => {
  it.each([
    ['ConnectException', { problem: 'refused' }],
    ['java.net.UnknownHostException: hooks.example', { problem: 'unknownHost' }],
    ['HttpTimeoutException: request timed out', { problem: 'timeout' }],
    ['PKIX path building failed', { problem: 'tls' }],
    ['HTTP 404 from hooks.slack.com', { problem: 'http', status: 404 }],
    ['status 401', { problem: 'auth', status: 401 }],
    ['535 Authentication failed', { problem: 'auth' }],
    ['something odd', { problem: 'other' }],
    [null, { problem: 'other' }],
  ])('%s', (raw, expected) => expect(describeDeliveryError(raw)).toEqual(expected));
});
