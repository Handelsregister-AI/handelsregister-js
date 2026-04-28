import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as cliProgress from 'cli-progress';
import {
  HandelsregisterConfig,
  SearchParams,
  CompanyData,
  DocumentType,
  EnrichmentOptions,
  EnrichmentResult,
  SearchOrganizationsParams,
  SearchOrganizationsResponse,
  FetchPersonParams,
  PersonData,
  CreateTokenParams,
  CreateTokenResponse,
  ListTokensResponse,
} from './types';
import {
  HandelsregisterError,
  AuthenticationError,
  InvalidResponseError,
  NetworkError,
  RateLimitError,
  ValidationError,
} from './errors';
import { Cache, generateCacheKey } from './utils/cache';
import { retry, sleep } from './utils/retry';
import { readFile, writeFile } from './utils/fileHandler';
import { version } from './version';

const DEFAULT_BASE_URL = 'https://handelsregister.ai/api/v1/';
const DEFAULT_TIMEOUT = 90000; // 90 seconds
const USER_AGENT = `handelsregister-js/${version}`;

function makeMultiFeatureSerializer() {
  return (params: Record<string, any>): string => {
    const parts: string[] = [];
    for (const key in params) {
      const value = params[key];
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        // Repeated parameter (e.g., feature=a&feature=b)
        const wireKey = key === 'features' ? 'feature' : key;
        value.forEach((v) => parts.push(`${encodeURIComponent(wireKey)}=${encodeURIComponent(String(v))}`));
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
    return parts.join('&');
  };
}

export class Handelsregister {
  private apiKey?: string;
  private bearerToken?: string;
  private httpClient: AxiosInstance;
  private cache?: Cache<unknown>;
  private rateLimit?: number;

  constructor(config: HandelsregisterConfig | string) {
    if (typeof config === 'string') {
      this.apiKey = config;
      config = { apiKey: config };
    } else {
      this.apiKey = config.apiKey;
      this.bearerToken = config.bearerToken;
    }

    if (!this.bearerToken) {
      const envBearer = process.env.HANDELSREGISTER_BEARER_TOKEN;
      if (envBearer) this.bearerToken = envBearer;
    }
    if (!this.apiKey) {
      const envApiKey = process.env.HANDELSREGISTER_API_KEY;
      if (envApiKey) this.apiKey = envApiKey;
    }

    if (!this.apiKey && !this.bearerToken) {
      throw new AuthenticationError(
        'API key or bearer token required. Pass apiKey/bearerToken to the constructor or set HANDELSREGISTER_API_KEY / HANDELSREGISTER_BEARER_TOKEN.',
      );
    }

    const baseURL = config.baseUrl || DEFAULT_BASE_URL;
    const timeout = config.timeout || DEFAULT_TIMEOUT;

    const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
    if (this.bearerToken) {
      headers['Authorization'] = `Bearer ${this.bearerToken}`;
    } else if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    this.httpClient = axios.create({
      baseURL,
      timeout,
      headers,
    });

    if (config.cacheEnabled !== false) {
      this.cache = new Cache<unknown>();
    }

    this.rateLimit = config.rateLimit;
  }

  // ------------------------------------------------------------------
  // Internal helpers
  // ------------------------------------------------------------------

  private async requestWithRetry<T>(
    fn: () => Promise<AxiosResponse<T>>,
  ): Promise<AxiosResponse<T>> {
    try {
      return await retry(
        async () => {
          if (this.rateLimit && this.rateLimit > 0) {
            await sleep(this.rateLimit * 1000);
          }
          return await fn();
        },
        {
          shouldRetry: (error: any) => {
            if (error?.response?.status === 401) return false;
            if (error?.response?.status === 429) return true;
            if (error?.response?.status >= 500) return true;
            if (!error?.response) return true; // Network errors
            return false;
          },
        },
      );
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private normalizeError(error: any): Error {
    if (error instanceof HandelsregisterError) return error;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data;
        if (status === 401) return new AuthenticationError();
        if (status === 429) return new RateLimitError();
        if (status === 404) {
          return new HandelsregisterError('Resource not found', 404, data);
        }
        return new HandelsregisterError(
          `API request failed with status ${status}`,
          status,
          data,
        );
      } else if (axiosError.request) {
        return new NetworkError('Network error: No response received from server');
      }
    }

    return new HandelsregisterError('An unexpected error occurred', undefined, error);
  }

  // ------------------------------------------------------------------
  // fetch-organization
  // ------------------------------------------------------------------

  async fetchOrganization(params: SearchParams | string): Promise<CompanyData> {
    const searchParams: SearchParams =
      typeof params === 'string' ? { q: params } : params;

    const query = (searchParams.q || '').trim();
    if (!query) {
      throw new ValidationError('Search query (q) is required');
    }

    const cacheKey = this.cache
      ? generateCacheKey({
          kind: 'organization',
          q: query,
          features: searchParams.features,
          ai_search: this.normalizeAiSearch(searchParams.aiSearch),
          realtime_mode: this.normalizeRealtimeMode(searchParams.realtimeMode),
        })
      : null;

    if (cacheKey && this.cache?.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached as CompanyData;
    }

    const queryParams: Record<string, any> = { q: query };

    if (searchParams.features && searchParams.features.length > 0) {
      queryParams['feature'] = searchParams.features;
    }

    const aiSearchValue = this.normalizeAiSearch(searchParams.aiSearch);
    if (aiSearchValue) queryParams.ai_search = aiSearchValue;

    const realtimeValue = this.normalizeRealtimeMode(searchParams.realtimeMode);
    if (realtimeValue) queryParams.realtime_mode = realtimeValue;

    const response = await this.requestWithRetry<CompanyData>(() =>
      this.httpClient.get('/fetch-organization', {
        params: queryParams,
        paramsSerializer: makeMultiFeatureSerializer(),
      }),
    );

    if (!response.data || typeof response.data !== 'object') {
      throw new InvalidResponseError('Invalid response format from API', response.data);
    }

    const companyData = response.data as CompanyData;
    if (cacheKey && this.cache) this.cache.set(cacheKey, companyData);
    return companyData;
  }

  private normalizeAiSearch(
    value: SearchParams['aiSearch'],
  ): 'on-default' | undefined {
    if (value === true || value === 'on-default') return 'on-default';
    return undefined;
  }

  private normalizeRealtimeMode(
    value: SearchParams['realtimeMode'],
  ): 'handelsregister-default' | undefined {
    if (value === true || value === 'handelsregister-default') return 'handelsregister-default';
    return undefined;
  }

  // ------------------------------------------------------------------
  // search-organizations
  // ------------------------------------------------------------------

  async searchOrganizations(
    params: SearchOrganizationsParams | string,
  ): Promise<SearchOrganizationsResponse> {
    const p: SearchOrganizationsParams =
      typeof params === 'string' ? { q: params } : params;

    const q = (p.q || '').trim();
    if (q.length < 2) {
      throw new ValidationError('Search query (q) must be at least 2 characters');
    }
    if (p.limit !== undefined && (p.limit < 1 || p.limit > 100)) {
      throw new ValidationError('limit must be between 1 and 100');
    }
    if (p.skip !== undefined && p.skip < 0) {
      throw new ValidationError('skip must be >= 0');
    }

    const cacheKey = this.cache
      ? generateCacheKey({
          kind: 'search',
          q,
          skip: p.skip ?? 0,
          limit: p.limit ?? 10,
          filters: p.filters ? JSON.stringify(p.filters) : '',
        })
      : null;

    if (cacheKey && this.cache?.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached as SearchOrganizationsResponse;
    }

    const queryParams: Record<string, any> = { q };
    if (p.skip !== undefined) queryParams.skip = p.skip;
    if (p.limit !== undefined) queryParams.limit = p.limit;
    if (p.filters) queryParams.filters = JSON.stringify(p.filters);

    const response = await this.requestWithRetry<SearchOrganizationsResponse>(() =>
      this.httpClient.get('/search-organizations', { params: queryParams }),
    );

    const data = response.data;
    if (cacheKey && this.cache) this.cache.set(cacheKey, data);
    return data;
  }

  // ------------------------------------------------------------------
  // fetch-person
  // ------------------------------------------------------------------

  async fetchPerson(params: FetchPersonParams): Promise<PersonData> {
    const personQ = (params.personQ || '').trim();
    const organizationQ = (params.organizationQ || '').trim();

    if (personQ.length < 2) {
      throw new ValidationError('personQ must be at least 2 characters');
    }
    if (organizationQ.length < 2) {
      throw new ValidationError('organizationQ must be at least 2 characters');
    }

    const cacheKey = this.cache
      ? generateCacheKey({
          kind: 'person',
          person_q: personQ,
          organization_q: organizationQ,
          features: params.features,
        })
      : null;

    if (cacheKey && this.cache?.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached as PersonData;
    }

    const queryParams: Record<string, any> = {
      person_q: personQ,
      organization_q: organizationQ,
    };
    if (params.features && params.features.length > 0) {
      queryParams['feature'] = params.features;
    }

    const response = await this.requestWithRetry<PersonData>(() =>
      this.httpClient.get('/fetch-person', {
        params: queryParams,
        paramsSerializer: makeMultiFeatureSerializer(),
      }),
    );

    const data = response.data;
    if (cacheKey && this.cache) this.cache.set(cacheKey, data);
    return data;
  }

  // ------------------------------------------------------------------
  // fetch-document
  // ------------------------------------------------------------------

  async fetchDocument(
    companyId: string,
    documentType: DocumentType,
    outputFile?: string,
  ): Promise<Buffer> {
    if (!companyId || companyId.trim() === '') {
      throw new ValidationError('Company ID is required');
    }

    const validDocumentTypes: DocumentType[] = [
      'shareholders_list',
      'articles_of_association',
      'AD',
      'CD',
    ];
    if (!validDocumentTypes.includes(documentType)) {
      throw new ValidationError(
        `Invalid document type. Must be one of: ${validDocumentTypes.join(', ')}`,
      );
    }

    const response = await this.requestWithRetry<ArrayBuffer>(() =>
      this.httpClient.get('/fetch-document', {
        params: {
          company_id: companyId,
          document_type: documentType,
        },
        responseType: 'arraybuffer',
      }),
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);

    if (outputFile) {
      const absolutePath = path.resolve(outputFile);
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(absolutePath, buffer);
    }

    return buffer;
  }

  // ------------------------------------------------------------------
  // Bearer token management
  // ------------------------------------------------------------------

  async createToken(params: CreateTokenParams): Promise<CreateTokenResponse> {
    if (!params.tokenName) {
      throw new ValidationError('tokenName is required');
    }
    const body: Record<string, any> = { token_name: params.tokenName };
    if (params.abilities !== undefined) body.abilities = params.abilities;
    if (params.expiresAt !== undefined) body.expires_at = params.expiresAt;

    const response = await this.requestWithRetry<CreateTokenResponse>(() =>
      this.httpClient.post('/auth/tokens/create', body),
    );
    return response.data;
  }

  async listTokens(): Promise<ListTokensResponse> {
    const response = await this.requestWithRetry<ListTokensResponse>(() =>
      this.httpClient.get('/auth/tokens'),
    );
    return response.data;
  }

  async revokeToken(tokenId: string | number): Promise<any> {
    if (tokenId === undefined || tokenId === null || tokenId === '') {
      throw new ValidationError('tokenId is required');
    }
    const response = await this.requestWithRetry<any>(() =>
      this.httpClient.delete(`/auth/tokens/${encodeURIComponent(String(tokenId))}`),
    );
    return response.data ?? {};
  }

  async revokeAllTokens(): Promise<any> {
    const response = await this.requestWithRetry<any>(() =>
      this.httpClient.delete('/auth/tokens'),
    );
    return response.data ?? {};
  }

  // ------------------------------------------------------------------
  // Bulk enrichment
  // ------------------------------------------------------------------

  async enrich(options: EnrichmentOptions): Promise<EnrichmentResult> {
    const {
      filePath,
      inputType,
      queryProperties,
      snapshotDir,
      snapshotInterval = 10,
      params = {},
    } = options;

    // Read input file
    const fileData = await readFile(filePath, inputType);
    const items = fileData.data;

    if (items.length === 0) {
      return {
        processedCount: 0,
        errorCount: 0,
        outputPath: filePath,
      };
    }

    // Setup snapshot mechanism
    let snapshotPath: string | undefined;
    let processedItems: any[] = [];
    let startIndex = 0;

    if (snapshotDir) {
      const snapshotFile = `snapshot_${path.basename(filePath, path.extname(filePath))}.json`;
      snapshotPath = path.join(snapshotDir, snapshotFile);

      if (fs.existsSync(snapshotPath)) {
        const snapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
        processedItems = snapshotData.processed || [];
        startIndex = processedItems.length;
      }
    }

    // Setup progress bar
    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} | {eta_formatted}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
    });

    progressBar.start(items.length, startIndex);

    const errors: Array<{ row: number; error: string }> = [];

    // Process items
    for (let i = startIndex; i < items.length; i++) {
      const item = items[i];

      try {
        // Build search query from item properties
        const queryParts: string[] = [];
        for (const [itemProp] of Object.entries(queryProperties)) {
          if (item[itemProp]) {
            queryParts.push(String(item[itemProp]));
          }
        }

        if (queryParts.length === 0) {
          throw new Error('No query properties found in item');
        }

        const searchParams: SearchParams = {
          q: queryParts.join(' '),
          ...params,
        };

        const companyData = await this.fetchOrganization(searchParams);

        // Merge company data with original item
        const enrichedItem = {
          ...item,
          handelsregister_data: companyData,
        };

        processedItems.push(enrichedItem);

        // Save snapshot at intervals
        if (snapshotPath && (i + 1) % snapshotInterval === 0) {
          fs.writeFileSync(
            snapshotPath,
            JSON.stringify(
              {
                processed: processedItems,
                lastIndex: i,
              },
              null,
              2,
            ),
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ row: i + 1, error: errorMessage });
        processedItems.push(item); // Keep original item on error
      }

      progressBar.update(i + 1);
    }

    progressBar.stop();

    // Write output file
    const outputPath = filePath.replace(
      new RegExp(`\\.${inputType}$`),
      `_enriched.${inputType}`,
    );

    await writeFile(outputPath, processedItems, inputType, fileData.headers);

    // Clean up snapshot
    if (snapshotPath && fs.existsSync(snapshotPath)) {
      fs.unlinkSync(snapshotPath);
    }

    return {
      processedCount: items.length - errors.length,
      errorCount: errors.length,
      outputPath,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
