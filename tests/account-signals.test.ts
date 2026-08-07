import nock from 'nock';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Handelsregister } from '../src/client';
import {
  AuthenticationError,
  InvalidResponseError,
  SubscriptionRequiredError,
  ValidationError,
} from '../src/errors';
import { SignalTopic } from '../src/constants';

const BASE_URL = 'https://handelsregister.ai';
const API_KEY = 'test-api-key';

describe('Account and Signals APIs', () => {
  let client: Handelsregister;

  beforeEach(() => {
    nock.cleanAll();
    client = new Handelsregister({ apiKey: API_KEY, cacheEnabled: false });
  });

  afterEach(() => nock.cleanAll());

  it('adds validated extra headers without changing authentication', async () => {
    const gatewayClient = new Handelsregister({
      apiKey: API_KEY,
      cacheEnabled: false,
      extraHeaders: { 'X-Gateway-Client-Id': 'placeholder' },
    });
    const scope = nock(BASE_URL, {
      reqheaders: {
        'x-api-key': API_KEY,
        'x-gateway-client-id': 'placeholder',
      },
    })
      .get('/api/v1/account')
      .reply(200, { name: 'Example' });

    await gatewayClient.getAccount();
    expect(scope.isDone()).toBe(true);
  });

  it.each(['Authorization', 'x-api-key', 'User-Agent'])(
    'rejects overriding the managed %s header',
    (name) => {
      expect(
        () =>
          new Handelsregister({
            apiKey: API_KEY,
            extraHeaders: { [name]: 'override' },
          }),
      ).toThrow(ValidationError);
    },
  );

  it('supports the account profile, credits, subscription, and API-key reads', async () => {
    nock(BASE_URL)
      .get('/api/v1/account')
      .reply(200, { name: 'Example' })
      .get('/api/v1/account/credits')
      .reply(200, { balance: { total: 100 } })
      .get('/api/v1/account/subscription')
      .reply(200, { plan: 'max' })
      .get('/api/v1/account/api-keys')
      .reply(200, { api_keys: [] });

    expect((await client.getAccount()).name).toBe('Example');
    expect((await client.getAccountCredits()).balance?.total).toBe(100);
    expect((await client.getAccountSubscription()).plan).toBe('max');
    expect((await client.listApiKeys()).api_keys).toEqual([]);
  });

  it('serializes usage parameters in the documented wire format', async () => {
    const scope = nock(BASE_URL)
      .get('/api/v1/account/usage')
      .query({
        from: '2026-07-01',
        to: '2026-07-30',
        group_by: 'day',
      })
      .reply(200, { totals: { requests: 2, credits_used: 20 } });

    const result = await client.getAccountUsage({
      fromDate: '2026-07-01',
      toDate: '2026-07-30',
      groupBy: 'day',
    });
    expect(result.totals?.requests).toBe(2);
    expect(scope.isDone()).toBe(true);
  });

  it('validates usage grouping and transaction page size', async () => {
    await expect(
      client.getAccountUsage({ groupBy: 'week' as 'day' }),
    ).rejects.toThrow(ValidationError);
    await expect(
      client.getAccountUsageTransactions({ perPage: 0 }),
    ).rejects.toThrow(ValidationError);
    await expect(
      client.getAccountUsageTransactions({ perPage: 101 }),
    ).rejects.toThrow(ValidationError);
  });

  it('iterates account transactions and preserves filters across cursors', async () => {
    nock(BASE_URL)
      .get('/api/v1/account/usage/transactions')
      .query({ endpoint: '/api/v1/signals', per_page: 2 })
      .reply(200, {
        transactions: [{ id: 1 }, { id: 2 }],
        pagination: { has_more: true, next_cursor: 'opaque-next' },
      })
      .get('/api/v1/account/usage/transactions')
      .query({
        endpoint: '/api/v1/signals',
        per_page: 2,
        cursor: 'opaque-next',
      })
      .reply(200, {
        transactions: [{ id: 3 }],
        pagination: { has_more: false },
      });

    const ids: unknown[] = [];
    for await (const transaction of client.iterateAccountUsageTransactions({
      endpoint: '/api/v1/signals',
      perPage: 2,
    })) {
      ids.push(transaction.id);
    }
    expect(ids).toEqual([1, 2, 3]);
  });

  it('rejects malformed and repeated account cursors', async () => {
    nock(BASE_URL)
      .get('/api/v1/account/usage/transactions')
      .query(true)
      .reply(200, {
        transactions: [],
        pagination: { has_more: true, next_cursor: 'same' },
      })
      .get('/api/v1/account/usage/transactions')
      .query(true)
      .reply(200, {
        transactions: [],
        pagination: { has_more: true, next_cursor: 'same' },
      });

    const consume = async () => {
      for await (const _transaction of client.iterateAccountUsageTransactions()) {
        // No entries are expected.
      }
    };
    await expect(consume()).rejects.toThrow(InvalidResponseError);
  });

  it('requires bearer authentication for API-key creation and revocation', async () => {
    await expect(client.createApiKey()).rejects.toThrow(AuthenticationError);
    await expect(client.revokeApiKey(1)).rejects.toThrow(AuthenticationError);

    const bearerClient = new Handelsregister({
      bearerToken: 'admin-token',
      cacheEnabled: false,
    });
    nock(BASE_URL, {
      reqheaders: { Authorization: 'Bearer admin-token' },
      badheaders: ['x-api-key'],
    })
      .post('/api/v1/account/api-keys')
      .reply(201, { api_key: { id: 7, key: 'shown-once' } })
      .delete('/api/v1/account/api-keys/7')
      .reply(200, { revoked: true });

    expect((await bearerClient.createApiKey()).api_key?.id).toBe(7);
    expect((await bearerClient.revokeApiKey(7)).revoked).toBe(true);
  });

  it('serializes all Signals filters including multiple organization IDs', async () => {
    const scope = nock(BASE_URL)
      .get('/api/v1/signals')
      .query({
        topics: 'CAPITAL_CHANGES,TRANSFORMATIONS',
        organization_ids: 'org-one,org-two',
        from: '2026-07-01',
        to: '2026-07-30',
      })
      .reply(200, {
        signals: [],
        pagination: { has_more: false, returned: 0 },
      });

    await client.listSignals({
      topics: [SignalTopic.CAPITAL_CHANGES, SignalTopic.TRANSFORMATIONS],
      organizationIds: ['org-one', 'org-two'],
      fromDate: '2026-07-01',
      toDate: '2026-07-30',
    });
    expect(scope.isDone()).toBe(true);
  });

  it('accepts comma-separated topics and rejects unknown topic arrays locally', async () => {
    nock(BASE_URL)
      .get('/api/v1/signals')
      .query({ topics: 'CAPITAL_CHANGES,TRANSFORMATIONS' })
      .reply(200, { signals: [], pagination: { has_more: false } });

    await client.listSignals({ topics: 'CAPITAL_CHANGES,TRANSFORMATIONS' });
    await expect(
      client.listSignals({ topics: ['UNKNOWN'] as never }),
    ).rejects.toThrow(ValidationError);
  });

  it('supports Signals catalog and encoded detail routes', async () => {
    nock(BASE_URL)
      .get('/api/v1/signals/catalog')
      .reply(200, { topics: [] })
      .get('/api/v1/signals/id%2Fwith%20space')
      .reply(200, { signal: { event: { id: 'x', topic: 'CAPITAL_CHANGES' } } });

    expect((await client.getSignalCatalog()).topics).toEqual([]);
    expect((await client.getSignal('id/with space')).signal?.event.id).toBe('x');
  });

  it('follows opaque Signals cursors lazily while preserving filters', async () => {
    nock(BASE_URL)
      .get('/api/v1/signals')
      .query({ topics: 'NEW_REGISTRATIONS', organization_ids: 'a,b' })
      .reply(200, {
        signals: [
          { event: { id: 'one', topic: 'NEW_REGISTRATIONS' } },
          { event: { id: 'two', topic: 'NEW_REGISTRATIONS' } },
        ],
        pagination: { has_more: true, next_cursor: 'opaque' },
      })
      .get('/api/v1/signals')
      .query({
        topics: 'NEW_REGISTRATIONS',
        organization_ids: 'a,b',
        cursor: 'opaque',
      })
      .reply(200, {
        signals: [{ event: { id: 'three', topic: 'NEW_REGISTRATIONS' } }],
        pagination: { has_more: false },
      });

    const ids: string[] = [];
    for await (const signal of client.iterateSignals({
      topics: [SignalTopic.NEW_REGISTRATIONS],
      organizationIds: ['a', 'b'],
      maxResults: 3,
    })) {
      ids.push(signal.event.id);
    }
    expect(ids).toEqual(['one', 'two', 'three']);
  });

  it('maps PLAN_REQUIRED to SubscriptionRequiredError', async () => {
    nock(BASE_URL)
      .get('/api/v1/signals')
      .query(true)
      .reply(403, {
        error: 'PLAN_REQUIRED',
        meta: { message: 'Max plan required' },
      });

    await expect(
      client.listSignals({ topics: [SignalTopic.TRANSFORMATIONS] }),
    ).rejects.toThrow(SubscriptionRequiredError);
  });

  it('iterates organization search pages with exact final-page sizing', async () => {
    nock(BASE_URL)
      .get('/api/v1/search-organizations')
      .query({ q: 'tech', skip: 0, limit: 2 })
      .reply(200, {
        results: [
          { entity_id: 'a', name: 'A' },
          { entity_id: 'b', name: 'B' },
        ],
        total: 4,
      })
      .get('/api/v1/search-organizations')
      .query({ q: 'tech', skip: 2, limit: 1 })
      .reply(200, {
        results: [{ entity_id: 'c', name: 'C' }],
        total: 4,
      });

    const ids: string[] = [];
    for await (const organization of client.iterateSearchOrganizations({
      q: 'tech',
      pageSize: 2,
      maxResults: 3,
    })) {
      ids.push(organization.entity_id);
    }
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});
