import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Handelsregister } from '../src/client';
import {
  IdempotencyConflictError,
  IdempotencyKeyRequiredError,
  ServerError,
  ValidationError,
} from '../src/errors';

const BASE_URL = 'https://handelsregister.ai';
const API_KEY = 'test-api-key';
const MONITOR_ID = 'mon_01hzy2q6j3g5m8v9x0abcde123';
const ENDPOINT_ID = 'wep_01hzy2q6j3g5m8v9x0abcde123';
const DELIVERY_ID = 'del_01hzy2q6j3g5m8v9x0abcde123';

describe('Monitoring and webhook management APIs', () => {
  let client: Handelsregister;

  beforeEach(() => {
    nock.cleanAll();
    client = new Handelsregister({ apiKey: API_KEY, cacheEnabled: false });
  });

  afterEach(() => nock.cleanAll());

  it('supports all free monitoring read routes', async () => {
    nock(BASE_URL)
      .get('/api/v1/account/monitoring/pricing')
      .query({ poll_interval_days: 7 })
      .reply(200, { estimate: { poll_interval_days: 7 } })
      .get('/api/v1/account/monitors')
      .reply(200, { monitors: [] })
      .get(`/api/v1/account/monitors/${MONITOR_ID}`)
      .reply(200, { monitor: { id: MONITOR_ID } })
      .get('/api/v1/account/webhook-endpoints')
      .reply(200, { endpoints: [] })
      .get('/api/v1/account/webhook-deliveries')
      .query({ endpoint: ENDPOINT_ID })
      .reply(200, { deliveries: [] })
      .get('/api/v1/account/webhook-events')
      .reply(200, { events: [] });

    expect((await client.getMonitoringPricing(7)).estimate).toBeDefined();
    expect((await client.listMonitors()).monitors).toEqual([]);
    expect((await client.getMonitor(MONITOR_ID)).monitor?.id).toBe(MONITOR_ID);
    expect((await client.listWebhookEndpoints()).endpoints).toEqual([]);
    expect((await client.listWebhookDeliveries(ENDPOINT_ID)).deliveries).toEqual(
      [],
    );
    expect((await client.listWebhookEvents()).events).toEqual([]);
  });

  it('creates a monitor with a durable key and no pricing policy input', async () => {
    const scope = nock(BASE_URL)
      .matchHeader('idempotency-key', /^sdk-js-[a-f0-9]{32}$/)
      .post('/api/v1/account/monitors', (body) => {
        const data = body as Record<string, unknown>;
        return (
          data.entity_id === 'organization-1' &&
          data.poll_interval_days === 7 &&
          JSON.stringify(data.endpoint_ids) === JSON.stringify([ENDPOINT_ID]) &&
          data.label === 'Example' &&
          data.pricing_policy_version === undefined
        );
      })
      .reply(202, { monitor: { id: MONITOR_ID, status: 'initializing' } });

    const result = await client.createMonitor({
      entityId: 'organization-1',
      pollIntervalDays: 7,
      endpointIds: [ENDPOINT_ID, ENDPOINT_ID],
      label: 'Example',
    });
    expect(result.monitor?.status).toBe('initializing');
    expect(scope.isDone()).toBe(true);
  });

  it('accepts explicit idempotency keys and captures replay status', async () => {
    nock(BASE_URL)
      .matchHeader('idempotency-key', 'operation-123')
      .post(`/api/v1/account/monitors/${MONITOR_ID}/pause`)
      .reply(200, { monitor: { id: MONITOR_ID } }, {
        'Idempotency-Status': 'replayed',
      });

    await client.pauseMonitor(MONITOR_ID, 'operation-123');
    expect(client.lastIdempotencyStatus).toBe('replayed');
  });

  it('uses the documented mutation routes and bodies', async () => {
    nock(BASE_URL)
      .matchHeader('idempotency-key', /.+/)
      .patch(`/api/v1/account/monitors/${MONITOR_ID}`, {
        poll_interval_days: 14,
      })
      .reply(200, {})
      .post(`/api/v1/account/monitors/${MONITOR_ID}/resume`)
      .reply(200, {})
      .delete(`/api/v1/account/monitors/${MONITOR_ID}`)
      .reply(200, {})
      .post(`/api/v1/account/webhook-endpoints/${ENDPOINT_ID}/rotate-secret`)
      .reply(200, {})
      .post(`/api/v1/account/webhook-endpoints/${ENDPOINT_ID}/enable`)
      .reply(200, {})
      .post(`/api/v1/account/webhook-endpoints/${ENDPOINT_ID}/disable`)
      .reply(200, {})
      .delete(`/api/v1/account/webhook-endpoints/${ENDPOINT_ID}`)
      .reply(200, {})
      .post(`/api/v1/account/webhook-deliveries/${DELIVERY_ID}/retry`)
      .reply(200, {});

    await client.updateMonitor(MONITOR_ID, 14);
    await client.resumeMonitor(MONITOR_ID);
    await client.archiveMonitor(MONITOR_ID);
    await client.rotateWebhookEndpointSecret(ENDPOINT_ID);
    await client.enableWebhookEndpoint(ENDPOINT_ID);
    await client.disableWebhookEndpoint(ENDPOINT_ID);
    await client.archiveWebhookEndpoint(ENDPOINT_ID);
    await client.retryWebhookDelivery(DELIVERY_ID);
    expect(nock.isDone()).toBe(true);
  });

  it('creates a webhook endpoint with write-only custom headers', async () => {
    const scope = nock(BASE_URL)
      .matchHeader('idempotency-key', /.+/)
      .post('/api/v1/account/webhook-endpoints', {
        name: 'Production receiver',
        url: 'https://hooks.example.com/handelsregister',
        headers: { 'x-tenant': 'customer-42' },
      })
      .reply(201, {
        endpoint: { id: ENDPOINT_ID },
        signing_secret: 'shown-once',
      });

    const result = await client.createWebhookEndpoint({
      name: 'Production receiver',
      url: 'https://hooks.example.com/handelsregister',
      headers: { 'x-tenant': 'customer-42' },
    });
    expect(result.signing_secret).toBe('shown-once');
    expect(scope.isDone()).toBe(true);
  });

  it.each([
    () => client.getMonitoringPricing(0),
    () => client.getMonitoringPricing(31),
    () => client.getMonitor('bad'),
    () => client.pauseMonitor(ENDPOINT_ID),
    () => client.retryWebhookDelivery(ENDPOINT_ID),
    () =>
      client.createMonitor({
        entityId: 'has spaces',
        pollIntervalDays: 7,
        endpointIds: ENDPOINT_ID,
      }),
    () =>
      client.createMonitor({
        entityId: 'valid',
        pollIntervalDays: 7,
        endpointIds: [],
      }),
    () =>
      client.createWebhookEndpoint({
        name: '',
        url: 'https://hooks.example.com/x',
      }),
    () =>
      client.createWebhookEndpoint({
        name: 'Receiver',
        url: '',
      }),
  ])('validates monitoring inputs locally', async (operation) => {
    await expect(operation()).rejects.toThrow(ValidationError);
  });

  it('maps HTTP 409 idempotency conflicts and never retries them', async () => {
    const scope = nock(BASE_URL)
      .post(`/api/v1/account/monitors/${MONITOR_ID}/pause`)
      .reply(409, { error: 'idempotency_conflict' });

    await expect(client.pauseMonitor(MONITOR_ID)).rejects.toThrow(
      IdempotencyConflictError,
    );
    expect(scope.isDone()).toBe(true);
  });

  it('maps HTTP 428 to IdempotencyKeyRequiredError', async () => {
    nock(BASE_URL)
      .post(`/api/v1/account/monitors/${MONITOR_ID}/pause`)
      .reply(428, { error: 'idempotency_key_required' });

    await expect(client.pauseMonitor(MONITOR_ID)).rejects.toThrow(
      IdempotencyKeyRequiredError,
    );
  });

  it('retries database mutations with the same idempotency key', async () => {
    const keys: string[] = [];
    nock(BASE_URL)
      .post(`/api/v1/account/monitors/${MONITOR_ID}/pause`)
      .reply(function replyOnce() {
        keys.push(String(this.req.headers['idempotency-key']));
        return [503, { error: 'temporarily_unavailable' }, { 'Retry-After': '0' }];
      })
      .post(`/api/v1/account/monitors/${MONITOR_ID}/pause`)
      .reply(function replyTwice() {
        keys.push(String(this.req.headers['idempotency-key']));
        return [200, { monitor: { id: MONITOR_ID } }];
      });

    await client.pauseMonitor(MONITOR_ID);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('does not retry ambiguous receiver-side 5xx responses', async () => {
    const scope = nock(BASE_URL)
      .post(`/api/v1/account/webhook-endpoints/${ENDPOINT_ID}/verify`)
      .reply(500, { error: 'internal' });

    await expect(client.verifyWebhookEndpoint(ENDPOINT_ID)).rejects.toThrow(
      ServerError,
    );
    expect(scope.isDone()).toBe(true);
  });

  it('retries the pre-operation verify kill switch safely', async () => {
    nock(BASE_URL)
      .post(`/api/v1/account/webhook-endpoints/${ENDPOINT_ID}/verify`)
      .reply(503, { error: 'temporarily_unavailable' }, { 'Retry-After': '0' })
      .post(`/api/v1/account/webhook-endpoints/${ENDPOINT_ID}/verify`)
      .reply(200, { verified: true, endpoint: { id: ENDPOINT_ID } });

    const result = await client.verifyWebhookEndpoint(ENDPOINT_ID);
    expect(result.verified).toBe(true);
  });

  it('returns failed verification payloads from HTTP 422', async () => {
    nock(BASE_URL)
      .post(`/api/v1/account/webhook-endpoints/${ENDPOINT_ID}/verify`)
      .reply(422, {
        verified: false,
        endpoint: { id: ENDPOINT_ID },
        meta: { reason: 'challenge_failed' },
      });

    const result = await client.verifyWebhookEndpoint(ENDPOINT_ID);
    expect(result.verified).toBe(false);
  });

  it('still raises generic HTTP 422 validation responses', async () => {
    nock(BASE_URL)
      .post('/api/v1/account/monitors')
      .reply(422, { message: 'The given data was invalid.' });

    await expect(
      client.createMonitor({
        entityId: 'valid',
        pollIntervalDays: 7,
        endpointIds: ENDPOINT_ID,
      }),
    ).rejects.toThrow(ValidationError);
  });
});
