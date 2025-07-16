import nock from 'nock';
import { Handelsregister } from '../src/client';
import { 
  AuthenticationError, 
  ValidationError, 
  RateLimitError,
  HandelsregisterError 
} from '../src/errors';
import { CompanyData } from '../src/types';

describe('Handelsregister Client', () => {
  const API_KEY = 'test-api-key';
  const BASE_URL = 'https://handelsregister.ai';
  let client: Handelsregister;
  
  // Enable nock debugging for troubleshooting
  if (process.env.DEBUG_NOCK) {
    nock.recorder.rec();
  }

  beforeEach(() => {
    client = new Handelsregister({
      apiKey: API_KEY,
      cacheEnabled: false // Disable cache for tests
    });
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('constructor', () => {
    it('should create client with API key string', () => {
      const client = new Handelsregister('test-key');
      expect(client).toBeInstanceOf(Handelsregister);
    });

    it('should create client with config object', () => {
      const client = new Handelsregister({
        apiKey: 'test-key',
        timeout: 30000,
        cacheEnabled: true
      });
      expect(client).toBeInstanceOf(Handelsregister);
    });

    it('should use environment variable if no API key provided', () => {
      const originalEnv = process.env.HANDELSREGISTER_API_KEY;
      process.env.HANDELSREGISTER_API_KEY = 'env-api-key';
      
      const client = new Handelsregister({ apiKey: '' });
      expect(client).toBeInstanceOf(Handelsregister);
      
      process.env.HANDELSREGISTER_API_KEY = originalEnv;
    });

    it('should throw error if no API key available', () => {
      const originalEnv = process.env.HANDELSREGISTER_API_KEY;
      delete process.env.HANDELSREGISTER_API_KEY;
      
      expect(() => new Handelsregister({ apiKey: '' })).toThrow(AuthenticationError);
      
      process.env.HANDELSREGISTER_API_KEY = originalEnv;
    });
  });

  describe('fetchOrganization', () => {
    const mockCompanyData: CompanyData = {
      entity_id: 'test-123',
      name: 'Test Company GmbH',
      legal_form: 'GmbH',
      status: 'active',
      register_number: 'HRB 12345'
    };

    it('should fetch company data with string query', async () => {
      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query({ api_key: API_KEY, q: 'Test Company' })
        .reply(200, mockCompanyData);

      const result = await client.fetchOrganization('Test Company');
      expect(result).toEqual(mockCompanyData);
    });

    it('should fetch company data with search params', async () => {
      // The client sends feature params as feature=value1&feature=value2
      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query((actualQuery) => {
          // Check that the query has the expected parameters
          return actualQuery.api_key === API_KEY &&
                 actualQuery.q === 'Test Company' &&
                 actualQuery.ai_search === 'off';
        })
        .reply(200, mockCompanyData);

      const result = await client.fetchOrganization({
        q: 'Test Company',
        features: ['financial_kpi', 'related_persons'],
        aiSearch: 'off'
      });
      expect(result).toEqual(mockCompanyData);
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

      await expect(client.fetchOrganization('Test Company')).rejects.toThrow(AuthenticationError);
    });

    it('should handle rate limit errors', async () => {
      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(429, { error: 'Rate limit exceeded' })
        .persist(); // Make sure nock doesn't get consumed by retries

      await expect(client.fetchOrganization('Test Company')).rejects.toThrow(RateLimitError);
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
        cacheEnabled: true
      });

      nock(BASE_URL)
        .get('/api/v1/fetch-organization')
        .query(true)
        .reply(200, mockCompanyData);

      // First call
      const result1 = await cachedClient.fetchOrganization('Test Company');
      expect(result1).toEqual(mockCompanyData);

      // Second call should use cache (no new request)
      const result2 = await cachedClient.fetchOrganization('Test Company');
      expect(result2).toEqual(mockCompanyData);
    });
  });

  describe('fetchDocument', () => {
    const mockPdfBuffer = Buffer.from('mock pdf content');

    it('should fetch document and return buffer', async () => {
      nock(BASE_URL)
        .get('/api/v1/fetch-document')
        .query({
          api_key: API_KEY,
          company_id: 'entity-123',
          document_type: 'shareholders_list'
        })
        .reply(200, mockPdfBuffer, {
          'Content-Type': 'application/pdf'
        });

      const result = await client.fetchDocument('entity-123', 'shareholders_list');
      expect(result).toEqual(mockPdfBuffer);
    });

    it('should validate company ID', async () => {
      await expect(client.fetchDocument('', 'AD')).rejects.toThrow(ValidationError);
    });

    it('should validate document type', async () => {
      await expect(
        client.fetchDocument('entity-123', 'invalid' as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle document not found', async () => {
      nock(BASE_URL)
        .get('/api/v1/fetch-document')
        .query(true)
        .reply(404, { error: 'Document not found' });

      await expect(
        client.fetchDocument('entity-123', 'AD')
      ).rejects.toThrow(HandelsregisterError);
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limit setting', async () => {
      const rateLimitedClient = new Handelsregister({
        apiKey: API_KEY,
        rateLimit: 0.1, // 100ms between requests
        cacheEnabled: false
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