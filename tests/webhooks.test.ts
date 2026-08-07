import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { WebhookSignatureError } from '../src/errors';
import {
  VERIFICATION_RESPONSE_HEADER,
  constructEvent,
  extractVerificationChallenge,
  verificationResponseHeaders,
  verifyWebhookSignature,
} from '../src/webhooks';

const SECRET_BYTES = Buffer.from('0123456789abcdef0123456789abcdef');
const SECRET = `whsec_${SECRET_BYTES.toString('base64')}`;
const OTHER_SECRET_BYTES = Buffer.from('fedcba9876543210fedcba9876543210');
const OTHER_SECRET = `whsec_${OTHER_SECRET_BYTES.toString('base64')}`;
const WEBHOOK_ID = 'msg_01j7n1abcdefghijklmnopqrst';

function sign(
  body: Buffer,
  timestamp: number,
  secretBytes: Buffer = SECRET_BYTES,
): string {
  const signedContent = Buffer.concat([
    Buffer.from(`${WEBHOOK_ID}.${timestamp}.`),
    body,
  ]);
  return `v1,${createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64')}`;
}

function headers(
  body: Buffer,
  options: {
    timestamp?: number;
    signature?: string;
    secretBytes?: Buffer;
  } = {},
): Record<string, string> {
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  return {
    'webhook-id': WEBHOOK_ID,
    'webhook-timestamp': String(timestamp),
    'webhook-signature':
      options.signature ?? sign(body, timestamp, options.secretBytes),
  };
}

function eventBody(type = 'organization.signal.detected'): Buffer {
  return Buffer.from(
    JSON.stringify({
      id: WEBHOOK_ID,
      event_id: 'evt_01j7n3abcdefghijklmnopqrst',
      type,
      timestamp: '2026-08-02T12:05:00.000Z',
      schema_version: 1,
      data: { monitor: { id: 'mon_x' }, signal: {} },
    }),
  );
}

describe('webhook receiver helpers', () => {
  it('verifies a valid signature over the exact raw body', () => {
    const body = eventBody();
    expect(() => verifyWebhookSignature(body, headers(body), SECRET)).not.toThrow();
  });

  it('accepts string payloads and case-insensitive headers', () => {
    const body = eventBody();
    const mixedCase = Object.fromEntries(
      Object.entries(headers(body)).map(([key, value]) => [
        key.replace(/(^|-)([a-z])/g, (_match, prefix, letter) =>
          `${prefix}${String(letter).toUpperCase()}`,
        ),
        value,
      ]),
    );
    expect(() =>
      verifyWebhookSignature(body.toString('utf8'), mixedCase, SECRET),
    ).not.toThrow();
  });

  it('accepts a secret without the whsec_ prefix', () => {
    const body = eventBody();
    expect(() =>
      verifyWebhookSignature(
        body,
        headers(body),
        SECRET_BYTES.toString('base64'),
      ),
    ).not.toThrow();
  });

  it('supports multiple signature candidates and rotated secrets', () => {
    const body = eventBody();
    const timestamp = Math.floor(Date.now() / 1000);
    const candidates = `${sign(body, timestamp, OTHER_SECRET_BYTES)} ${sign(
      body,
      timestamp,
    )}`;
    expect(() =>
      verifyWebhookSignature(
        body,
        headers(body, { timestamp, signature: candidates }),
        SECRET,
      ),
    ).not.toThrow();

    expect(() =>
      verifyWebhookSignature(
        body,
        headers(body, { secretBytes: OTHER_SECRET_BYTES }),
        [SECRET, OTHER_SECRET],
      ),
    ).not.toThrow();
  });

  it('ignores unsupported signature versions', () => {
    const body = eventBody();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = `v2,AAAA ${sign(body, timestamp)}`;
    expect(() =>
      verifyWebhookSignature(
        body,
        headers(body, { timestamp, signature }),
        SECRET,
      ),
    ).not.toThrow();
  });

  it('rejects wrong signatures and tampered bodies', () => {
    const body = eventBody();
    expect(() =>
      verifyWebhookSignature(
        body,
        headers(body, { signature: `v1,${Buffer.alloc(32).toString('base64')}` }),
        SECRET,
      ),
    ).toThrow(WebhookSignatureError);
    expect(() =>
      verifyWebhookSignature(
        Buffer.concat([body, Buffer.from(' ')]),
        headers(body),
        SECRET,
      ),
    ).toThrow(WebhookSignatureError);
  });

  it.each(['webhook-id', 'webhook-timestamp', 'webhook-signature'])(
    'rejects a missing %s header',
    (missing) => {
      const body = eventBody();
      const requestHeaders = headers(body);
      delete requestHeaders[missing];
      expect(() =>
        verifyWebhookSignature(body, requestHeaders, SECRET),
      ).toThrow(WebhookSignatureError);
    },
  );

  it('rejects invalid and stale timestamps unless tolerance is disabled', () => {
    const body = eventBody();
    expect(() =>
      verifyWebhookSignature(
        body,
        {
          ...headers(body),
          'webhook-timestamp': 'not-a-number',
        },
        SECRET,
      ),
    ).toThrow(WebhookSignatureError);

    const timestamp = Math.floor(Date.now() / 1000) - 4000;
    const staleHeaders = headers(body, { timestamp });
    expect(() => verifyWebhookSignature(body, staleHeaders, SECRET)).toThrow(
      WebhookSignatureError,
    );
    expect(() =>
      verifyWebhookSignature(body, staleHeaders, SECRET, null),
    ).not.toThrow();
  });

  it('validates webhook secrets', () => {
    const body = eventBody();
    expect(() =>
      verifyWebhookSignature(body, headers(body), 'whsec_%%%not-base64%%%'),
    ).toThrow(/base64/);
    expect(() => verifyWebhookSignature(body, headers(body), [])).toThrow(
      /secret/,
    );
  });

  it('constructs verified event envelopes', () => {
    const body = eventBody();
    const event = constructEvent(body, headers(body), SECRET);
    expect(event.type).toBe('organization.signal.detected');
    expect(event.id).toBe(WEBHOOK_ID);
  });

  it('rejects non-JSON bodies after signature verification', () => {
    const body = Buffer.from('not json');
    expect(() => constructEvent(body, headers(body), SECRET)).toThrow(/JSON/);
  });

  it('extracts and formats verification challenges', () => {
    const event = {
      id: WEBHOOK_ID,
      type: 'endpoint.verification',
      data: { challenge: '40f2abc' },
    };
    expect(extractVerificationChallenge(event)).toBe('40f2abc');
    expect(verificationResponseHeaders(event)).toEqual({
      [VERIFICATION_RESPONSE_HEADER]: '40f2abc',
    });
    expect(
      extractVerificationChallenge({
        type: 'organization.signal.detected',
        data: { challenge: 'x' },
      }),
    ).toBeUndefined();
    expect(() =>
      verificationResponseHeaders({ type: 'endpoint.test', data: {} }),
    ).toThrow(/verification/);
  });
});
