/** Receiver-side helpers for signed handelsregister.ai monitoring webhooks. */

import { createHmac, timingSafeEqual } from 'crypto';
import { WebhookSignatureError } from './errors.js';
import type { WebhookEventEnvelope } from './types.js';

export const VERIFICATION_RESPONSE_HEADER = 'webhook-verification';
export const DEFAULT_TOLERANCE_SECONDS = 300;

export type WebhookPayload = string | Buffer | Uint8Array;
export type WebhookHeaders =
  | Record<string, unknown>
  | { get(name: string): unknown };
export type WebhookSecret = string | ReadonlyArray<string>;

const SECRET_PREFIX = 'whsec_';
const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function payloadBuffer(payload: WebhookPayload): Buffer {
  if (typeof payload === 'string') return Buffer.from(payload, 'utf8');
  if (Buffer.isBuffer(payload)) return payload;
  if (payload instanceof Uint8Array) return Buffer.from(payload);
  throw new TypeError('Webhook payload must be the exact raw request body.');
}

function decodeSecret(secret: string): Buffer {
  if (typeof secret !== 'string' || !secret.trim()) {
    throw new TypeError('Webhook secret must be a non-empty string.');
  }
  const value = secret.trim();
  const material = value.startsWith(SECRET_PREFIX)
    ? value.slice(SECRET_PREFIX.length)
    : value;
  if (!material || !BASE64_PATTERN.test(material)) {
    throw new TypeError(
      "Webhook secret is not valid base64. Pass the full 'whsec_...' value returned by the API.",
    );
  }
  return Buffer.from(material, 'base64');
}

function normalizeSecrets(secret: WebhookSecret): Buffer[] {
  const values = typeof secret === 'string' ? [secret] : Array.from(secret);
  if (values.length === 0) {
    throw new TypeError('At least one webhook secret is required.');
  }
  return values.map(decodeSecret);
}

function headerValue(headers: WebhookHeaders, name: string): string | undefined {
  const getter: unknown = (headers as { get?: unknown }).get;
  if (typeof getter === 'function') {
    const value: unknown = (getter as (headerName: string) => unknown).call(
      headers,
      name,
    );
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }
  }
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== name || value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      return value
        .filter(
          (item): item is string | number | boolean =>
            ['string', 'number', 'boolean'].includes(typeof item),
        )
        .map(String)
        .join(' ');
    }
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }
    return undefined;
  }
  return undefined;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'utf8');
  const rightBytes = Buffer.from(right, 'utf8');
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

export function verifyWebhookSignature(
  payload: WebhookPayload,
  headers: WebhookHeaders,
  secret: WebhookSecret,
  toleranceSeconds: number | null = DEFAULT_TOLERANCE_SECONDS,
): void {
  const body = payloadBuffer(payload);
  const secrets = normalizeSecrets(secret);
  const webhookId = headerValue(headers, 'webhook-id');
  const timestampValue = headerValue(headers, 'webhook-timestamp');
  const signature = headerValue(headers, 'webhook-signature');

  if (!webhookId || !timestampValue || !signature) {
    throw new WebhookSignatureError(
      'Missing webhook-id, webhook-timestamp or webhook-signature header.',
    );
  }

  if (!/^-?\d+$/.test(timestampValue.trim())) {
    throw new WebhookSignatureError(
      "Header 'webhook-timestamp' is not a Unix-seconds integer.",
    );
  }
  const timestamp = Number(timestampValue);
  if (!Number.isSafeInteger(timestamp)) {
    throw new WebhookSignatureError(
      "Header 'webhook-timestamp' is not a safe Unix-seconds integer.",
    );
  }
  if (toleranceSeconds !== null) {
    if (!Number.isFinite(toleranceSeconds) || toleranceSeconds < 0) {
      throw new TypeError('toleranceSeconds must be a non-negative number or null.');
    }
    const skew = Math.abs(Date.now() / 1000 - timestamp);
    if (skew > toleranceSeconds) {
      throw new WebhookSignatureError(
        `Webhook timestamp is outside the allowed tolerance of ${toleranceSeconds} seconds.`,
      );
    }
  }

  const prefix = Buffer.from(`${webhookId}.${timestamp}.`, 'utf8');
  const signedContent = Buffer.concat([prefix, body]);
  const expected = secrets.map((key) =>
    createHmac('sha256', key).update(signedContent).digest('base64'),
  );

  for (const candidate of signature.split(/\s+/)) {
    if (!candidate.startsWith('v1,')) continue;
    const candidateValue = candidate.slice(3);
    if (expected.some((value) => constantTimeEqual(candidateValue, value))) {
      return;
    }
  }
  throw new WebhookSignatureError(
    'Webhook signature does not match any known secret.',
  );
}

export function constructEvent<
  TData extends Record<string, unknown> = Record<string, unknown>,
>(
  payload: WebhookPayload,
  headers: WebhookHeaders,
  secret: WebhookSecret,
  toleranceSeconds: number | null = DEFAULT_TOLERANCE_SECONDS,
): WebhookEventEnvelope<TData> {
  verifyWebhookSignature(payload, headers, secret, toleranceSeconds);
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadBuffer(payload).toString('utf8')) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const syntaxError = new TypeError(
      `Verified webhook body is not valid JSON: ${message}`,
    );
    (syntaxError as TypeError & { cause?: unknown }).cause = error;
    throw syntaxError;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('Verified webhook body is not a JSON object.');
  }
  return parsed as WebhookEventEnvelope<TData>;
}

export function extractVerificationChallenge(
  event: Record<string, unknown>,
): string | undefined {
  if (event.type !== 'endpoint.verification') return undefined;
  const data = event.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
  const challenge = (data as Record<string, unknown>).challenge;
  return typeof challenge === 'string' && challenge ? challenge : undefined;
}

export function verificationResponseHeaders(
  event: Record<string, unknown>,
): Record<string, string> {
  const challenge = extractVerificationChallenge(event);
  if (!challenge) {
    throw new TypeError("Event is not an 'endpoint.verification' challenge.");
  }
  return { [VERIFICATION_RESPONSE_HEADER]: challenge };
}
