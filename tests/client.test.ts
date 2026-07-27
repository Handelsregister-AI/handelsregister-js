import nock from 'nock';
import { Handelsregister } from '../src/client';
import {
  AuthenticationError,
  ValidationError,
  RateLimitError,
  HandelsregisterError,
  PaymentRequiredError,
  ForbiddenError,
  NotFoundError,
  RequestTimeoutError,
} from '../src/errors';
import { CompanyData, PersonData, SearchOrganizationsResponse } from '../src/types';

describe('Handelsregister Client', () => {
  const API_KEY = 'test-api-key';
  const BASE_URL = 'https://handelsregister.ai';
  let client: Handelsregister;

  beforeEach(() => {
    client = new Handelsregister({
      apiKey: API_KEY,
      cacheEnabled: false, // Disable cache for tests
    });
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('constructor', () => {
    it('should create client with API key string', () => {
      const c = new Handelsregister('test-key');
      expect(c).toBeInstanceOf(Handelsregister);
    });

    it('should create client with config object', () => {
      const c = new Handelsregister({
        apiKey: 'test-key',
        timeout: 30000,
        cacheEnabled: true,
      });
      expect(c).toBeInstanceOf(Handelsregister);
    });

    it('should create client with bearer token', () => {
      const c = new Handelsregister({ bearerToken: 'token-abc' });
      expect(c).toBeInstanceOf(Handelsregister);
    });

    it('should use environment variable if no API key provided', () => {
      const originalEnv = process.env.HANDELSREGISTER_API_KEY;
      process.env.HANDELSREGISTER_API_KEY = 'env-api-key';

      try {
        const c = new Handelsregister({ apiKey: '' });
        expect(c).toBeInstanceOf(Handelsregister);
      } finally {
        restoreEnv('HANDELSREGISTER_API_KEY', originalEnv);
      }
    });

    it('should use HANDELSREGISTER_BEARER_TOKEN env var when set', () => {
      const originalApiKey = process.env.HANDELSREGISTER_API_KEY;
      const originalBearer = process.env.HANDELSREGISTER_BEARER_TOKEN;
      delete process.env.HANDELSREGISTER_API_KEY;
      process.env.HANDELSREGISTER_BEARER_TOKEN = 'env-bearer';

      try {
        const c = new Handelsregister({});
        expect(c).toBeInstanceOf(Handelsregister);
      } finally {
        restoreEnv('HANDELSREGISTER_API_KEY', originalApiKey);
        restoreEnv('HANDELSREGISTER_BEARER_TOKEN', originalBearer);
      }
    });

    it('should throw error if no auth available', () => {
      const originalApiKey = process.env.HANDELSREGISTER_API_KEY;
      const originalBearer = process.env.HANDELSREGISTER_BEARER_TOKEN;
      delete process.env.HANDELSREGISTER_API_KEY;
      delete process.env.HANDELSREGISTER_BEARER_TOKEN;

      try {
        expect(() => new Handelsregister({ apiKey: '' })).toThrow(AuthenticationError);
      } finally {
        restoreEnv('HANDELSREGISTER_API_KEY', originalApiKey);
        restoreEnv('HANDELSREGISTER_BEARER_TOKEN', originalBearer);
      }
    });
  });

  function restoreEnv(name: string, value: string | undefined) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }

  describe('authentication wire format', () => {
    const mockData: CompanyData = { entity_id: 'x', name: 'X' };

    it('sends api key in x-api-key header, NOT in query string', async () => {
      const scope = nock(BASE_URL, { reqheaders: { 'x-api-key': API_KEY } })
        .get('/api/v1/fetch-organization')
        .query((q) => q.api_key === undefined && q.q === 'X')
        .reply(200, mockData);

      await client.fetchOrganization('X');
      expect(scope.isDone()).toBe(true);
    });

    it('sends Authorization: Bearer header when bearer token configured', async () => {
      const bearerClient = new Handelsregister({
        bearerToken: 'TOK',
        cacheEnabled: false,
      });

      const scope = nock(BASE_URL, {
        reqheaders: { Authorization: 'Bearer TOK' },
        badheaders: ['x-api-key'],
      })
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(200, mockData);

      await bearerClient.fetchOrganization('X');
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('fetchOrganization', () => {
    const mockCompanyData: CompanyData = {
      entity_id: 'test-123',
      name: 'Test Company GmbH',
      legal_form: 'GmbH',
      status: 'active',
      register_number: 'HRB 12345',
    };

    it('should fetch company data with string query', async () => {
      nock(BASE_URL, { reqheaders: { 'x-api-key': API_KEY } })
        .get('/api/v1/fetch-organization')
        .query({ q: 'Test Company' })
        .reply(200, mockCompanyData);

      const result = await client.fetchOrganization('Test Company');
      expect(result).toEqual(mockCompanyData);
    });

    it('should send features as repeated feature= params', async () => {
      const scope = nock(BASE_URL, { reqheaders: { 'x-api-key': API_KEY } })
        .get('/api/v1/fetch-organization')
        .query((actual) => {
          // nock parses repeated keys into an array
          const features = ([] as string[]).concat(actual.feature || []);
          return (
            actual.q === 'Test Company' &&
            features.includes('financial_kpi') &&
            features.includes('related_persons')
          );
        })
        .reply(200, mockCompanyData);

      const result = await client.fetchOrganization({
        q: 'Test Company',
        features: ['financial_kpi', 'related_persons'],
      });
      expect(result).toEqual(mockCompanyData);
      expect(scope.isDone()).toBe(true);
    });

    it('supports mergers_and_acquisitions as a feature', async () => {
      const scope = nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(
          (query) =>
            query.q === 'Test Company' &&
            query.feature === 'mergers_and_acquisitions',
        )
        .reply(200, {
          ...mockCompanyData,
          mergers_and_acquisitions: {
            transactions: [],
            control: { controlled_by: [], controls: [], former: [] },
            summary: { total_transactions: 0 },
          },
        });

      await client.fetchOrganization({
        q: 'Test Company',
        features: ['mergers_and_acquisitions'],
      });
      expect(scope.isDone()).toBe(true);
    });

    it('should send ai_search=on-default when aiSearch is true', async () => {
      const scope = nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query((q) => q.ai_search === 'on-default')
        .reply(200, mockCompanyData);

      await client.fetchOrganization({ q: 'X', aiSearch: true });
      expect(scope.isDone()).toBe(true);
    });

    it('should send ai_search=on-default when aiSearch is the literal "on-default"', async () => {
      const scope = nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query((q) => q.ai_search === 'on-default')
        .reply(200, mockCompanyData);

      await client.fetchOrganization({ q: 'X', aiSearch: 'on-default' });
      expect(scope.isDone()).toBe(true);
    });

    it('should NOT send ai_search when aiSearch is false', async () => {
      const scope = nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query((q) => q.ai_search === undefined)
        .reply(200, mockCompanyData);

      await client.fetchOrganization({ q: 'X', aiSearch: false });
      expect(scope.isDone()).toBe(true);
    });

    it('should send realtime_mode=handelsregister-default when realtimeMode is true', async () => {
      const scope = nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query((q) => q.realtime_mode === 'handelsregister-default')
        .reply(200, mockCompanyData);

      await client.fetchOrganization({ q: 'X', realtimeMode: true });
      expect(scope.isDone()).toBe(true);
    });

    it('should throw ValidationError for empty query', async () => {
      await expect(client.fetchOrganization('')).rejects.toThrow(ValidationError);
      await expect(client.fetchOrganization({ q: '' })).rejects.toThrow(ValidationError);
    });

    it('should handle authentication errors', async () => {
      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(401, { error: 'Invalid API key' });

      await expect(client.fetchOrganization('Test Company')).rejects.toThrow(
        AuthenticationError,
      );
    });

    it('should handle rate limit errors', async () => {
      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(429, { error: 'Rate limit exceeded' })
        .persist();

      await expect(client.fetchOrganization('Test Company')).rejects.toThrow(
        RateLimitError,
      );
    });

    it('should retry on server errors', async () => {
      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(500, { error: 'Server error' })
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(200, mockCompanyData);

      const result = await client.fetchOrganization('Test Company');
      expect(result).toEqual(mockCompanyData);
    });

    it('should use cache when enabled', async () => {
      const cachedClient = new Handelsregister({
        apiKey: API_KEY,
        cacheEnabled: true,
      });

      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(200, mockCompanyData);

      const r1 = await cachedClient.fetchOrganization('Test Company');
      expect(r1).toEqual(mockCompanyData);

      // Second call should use cache (no new request)
      const r2 = await cachedClient.fetchOrganization('Test Company');
      expect(r2).toEqual(mockCompanyData);
    });
  });

  describe('searchOrganizations', () => {
    const mockResponse: SearchOrganizationsResponse = {
      results: [
        { entity_id: 'a', name: 'Alpha GmbH' },
        { entity_id: 'b', name: 'Beta GmbH' },
      ],
      total: 2,
      meta: { request_credit_cost: 1, credits_remaining: 99 },
    };

    it('returns results with totals', async () => {
      nock(BASE_URL, { reqheaders: { 'x-api-key': API_KEY } })
        .get('/api/v1/search-organizations')
        .query({ q: 'tech', skip: 0, limit: 10 })
        .reply(200, mockResponse);

      const result = await client.searchOrganizations({ q: 'tech', skip: 0, limit: 10 });
      expect(result.total).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it('serializes filters as JSON', async () => {
      const scope = nock(BASE_URL)
        .get('/api/v1/search-organizations')
        .query((q) => q.filters === JSON.stringify({ postal_code: '80331' }))
        .reply(200, mockResponse);

      await client.searchOrganizations({
        q: 'tech',
        filters: { postal_code: '80331' },
      });
      expect(scope.isDone()).toBe(true);
    });

    it('supports a filter-only search without q', async () => {
      const filters = {
        legal_form_code: ['GmbH', 'UG'],
        active: true,
        pl_revenue: { gte: 1_000_000, lte: 5_000_000 },
      };
      const scope = nock(BASE_URL)
        .get('/api/v1/search-organizations')
        .query(
          (query) =>
            query.q === undefined &&
            query.limit === '30' &&
            query.filters === JSON.stringify(filters),
        )
        .reply(200, mockResponse);

      await client.searchOrganizations({ filters, limit: 30 });
      expect(scope.isDone()).toBe(true);
    });

    it('sends ai_mode=on-default when search AI mode is enabled', async () => {
      const scope = nock(BASE_URL)
        .get('/api/v1/search-organizations')
        .query(
          (query) =>
            query.q === 'tech' && query.ai_mode === 'on-default',
        )
        .reply(200, mockResponse);

      await client.searchOrganizations({ q: 'tech', aiMode: true });
      expect(scope.isDone()).toBe(true);
    });

    it('requires q or at least one filter', async () => {
      await expect(client.searchOrganizations({})).rejects.toThrow(
        ValidationError,
      );
      await expect(
        client.searchOrganizations({ filters: {} }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects too-short query', async () => {
      await expect(client.searchOrganizations({ q: 'a' })).rejects.toThrow(
        ValidationError,
      );
    });

    it('rejects out-of-range limit', async () => {
      await expect(
        client.searchOrganizations({ q: 'tech', limit: 0 }),
      ).rejects.toThrow(ValidationError);
      await expect(
        client.searchOrganizations({ q: 'tech', limit: 31 }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects negative skip', async () => {
      await expect(
        client.searchOrganizations({ q: 'tech', skip: -1 }),
      ).rejects.toThrow(ValidationError);
    });

    it('validates coordinate radius filters', async () => {
      await expect(
        client.searchOrganizations({
          filters: { location_max_distance_km: 10 },
        }),
      ).rejects.toThrow(ValidationError);
      await expect(
        client.searchOrganizations({
          filters: {
            location_coordinates: { latitude: 48.13, longitude: 11.58 },
            location_max_distance_km: 101,
          },
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('fetchPerson', () => {
    const mockPerson: PersonData = {
      entity_id: 'p1',
      name: 'Erika Mustermann',
      bio: 'Founder',
    };

    it('sends person_q and organization_q', async () => {
      const scope = nock(BASE_URL, { reqheaders: { 'x-api-key': API_KEY } })
        .get('/api/v1/fetch-person')
        .query({ person_q: 'Erika Mustermann', organization_q: 'Musterfirma GmbH' })
        .reply(200, mockPerson);

      const result = await client.fetchPerson({
        personQ: 'Erika Mustermann',
        organizationQ: 'Musterfirma GmbH',
      });
      expect(result).toEqual(mockPerson);
      expect(scope.isDone()).toBe(true);
    });

    it('sends features as repeated feature= params', async () => {
      const scope = nock(BASE_URL)
        .get('/api/v1/fetch-person')
        .query((actual) => {
          const features = ([] as string[]).concat(actual.feature || []);
          return features.includes('shareholdings');
        })
        .reply(200, mockPerson);

      await client.fetchPerson({
        personQ: 'Erika Mustermann',
        organizationQ: 'Musterfirma GmbH',
        features: ['shareholdings'],
      });
      expect(scope.isDone()).toBe(true);
    });

    it('rejects too-short personQ', async () => {
      await expect(
        client.fetchPerson({ personQ: 'a', organizationQ: 'Musterfirma GmbH' }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects too-short organizationQ', async () => {
      await expect(
        client.fetchPerson({ personQ: 'Erika Mustermann', organizationQ: 'a' }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('fetchDocument', () => {
    const mockPdfBuffer = Buffer.from('mock pdf content');

    it('should fetch document and return buffer', async () => {
      nock(BASE_URL, { reqheaders: { 'x-api-key': API_KEY } })
        .get('/api/v1/fetch-document')
        .query({
          company_id: 'entity-123',
          document_type: 'shareholders_list',
        })
        .reply(200, mockPdfBuffer, {
          'Content-Type': 'application/pdf',
        });

      const result = await client.fetchDocument('entity-123', 'shareholders_list');
      expect(result).toEqual(mockPdfBuffer);
    });

    it('accepts new articles_of_association doc type', async () => {
      nock(BASE_URL)
        .get('/api/v1/fetch-document')
        .query({
          company_id: 'entity-123',
          document_type: 'articles_of_association',
        })
        .reply(200, mockPdfBuffer, { 'Content-Type': 'application/pdf' });

      const result = await client.fetchDocument(
        'entity-123',
        'articles_of_association',
      );
      expect(result).toEqual(mockPdfBuffer);
    });

    it('accepts SI and exposes XML response metadata', async () => {
      const xml = Buffer.from('<?xml version="1.0"?><root/>');
      nock(BASE_URL)
        .get('/api/v1/fetch-document')
        .query({
          company_id: 'entity-123',
          document_type: 'SI',
        })
        .reply(200, xml, {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': 'attachment; filename="company.xml"',
        });

      const result = await client.fetchDocumentWithMetadata({
        companyId: 'entity-123',
        documentType: 'SI',
      });
      expect(result.data).toEqual(xml);
      expect(result.documentType).toBe('SI');
      expect(result.contentType).toContain('application/xml');
      expect(result.fileName).toBe('company.xml');
    });

    it('should validate company ID', async () => {
      await expect(client.fetchDocument('', 'AD')).rejects.toThrow(ValidationError);
    });

    it('should validate document type', async () => {
      await expect(
        client.fetchDocument('entity-123', 'invalid' as any),
      ).rejects.toThrow(ValidationError);
    });

    it('should handle document not found', async () => {
      nock(BASE_URL)
        .get('/api/v1/fetch-document')
        .query(true)
        .reply(404, { error: 'Document not found' });

      await expect(client.fetchDocument('entity-123', 'AD')).rejects.toThrow(
        HandelsregisterError,
      );
    });
  });

  describe('token management', () => {
    it('createToken POSTs to /auth/tokens/create with snake_cased body', async () => {
      const scope = nock(BASE_URL, { reqheaders: { 'x-api-key': API_KEY } })
        .post('/api/v1/auth/tokens/create', {
          token_name: 'my-token',
          abilities: ['*'],
          expires_at: '2026-12-31 23:59:59',
        })
        .reply(200, { token: 'NEW-TOKEN-VALUE' });

      const result = await client.createToken({
        tokenName: 'my-token',
        abilities: ['*'],
        expiresAt: '2026-12-31 23:59:59',
      });
      expect(result).toEqual({ token: 'NEW-TOKEN-VALUE' });
      expect(scope.isDone()).toBe(true);
    });

    it('createToken rejects empty tokenName', async () => {
      await expect(client.createToken({ tokenName: '' })).rejects.toThrow(
        ValidationError,
      );
    });

    it('listTokens GETs /auth/tokens', async () => {
      nock(BASE_URL)
        .get('/api/v1/auth/tokens')
        .reply(200, { tokens: [{ id: 1, name: 't' }] });

      const result = await client.listTokens();
      expect(result.tokens).toHaveLength(1);
    });

    it('revokeToken DELETEs /auth/tokens/{id}', async () => {
      const scope = nock(BASE_URL).delete('/api/v1/auth/tokens/42').reply(200, {});

      const result = await client.revokeToken(42);
      expect(result).toEqual({});
      expect(scope.isDone()).toBe(true);
    });

    it('revokeToken rejects empty id', async () => {
      await expect(client.revokeToken('')).rejects.toThrow(ValidationError);
    });

    it('revokeAllTokens DELETEs /auth/tokens', async () => {
      const scope = nock(BASE_URL).delete('/api/v1/auth/tokens').reply(200, {});

      await client.revokeAllTokens();
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('documented API errors', () => {
    it.each([
      [
        402,
        { meta: { message: 'Insufficient credits' } },
        PaymentRequiredError,
      ],
      [
        403,
        {
          error: 'subscription_required',
          meta: { message: 'An active subscription is required' },
        },
        ForbiddenError,
      ],
      [
        404,
        { detail: [{ msg: 'Organization does not exist' }] },
        NotFoundError,
      ],
      [408, 'Request Timeout', RequestTimeoutError],
    ])(
      'maps HTTP %s to a specific SDK error',
      async (status, response, ExpectedError) => {
        nock(BASE_URL)
          .get('/api/v1/fetch-organization')
          .query(true)
          .reply(status as number, response);

        await expect(client.fetchOrganization('Missing')).rejects.toThrow(
          ExpectedError as typeof Error,
        );
      },
    );

    it('preserves the subscription error code', async () => {
      nock(BASE_URL)
        .get('/api/v1/fetch-person')
        .query(true)
        .reply(403, {
          error: 'subscription_required',
          meta: { message: 'fetch-person requires a subscription' },
        });

      try {
        await client.fetchPerson({
          personQ: 'Erika Mustermann',
          organizationQ: 'Musterfirma GmbH',
        });
        throw new Error('Expected fetchPerson to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).errorCode).toBe(
          'subscription_required',
        );
      }
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limit setting', async () => {
      const rateLimitedClient = new Handelsregister({
        apiKey: API_KEY,
        rateLimit: 0.1, // 100ms between requests
        cacheEnabled: false,
      });

      const mockData = { entity_id: 'test', name: 'Test' };

      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)
        .times(2)
        .reply(200, mockData);

      const start = Date.now();

      await rateLimitedClient.fetchOrganization('Test 1');
      await rateLimitedClient.fetchOrganization('Test 2');

      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });
});
