import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { randomUUID } from 'crypto';
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
  TokenRevocationResponse,
  FetchDocumentParams,
  FetchedDocument,
  SearchOrganizationFilters,
  AccountResponse,
  AccountCreditsResponse,
  AccountSubscriptionResponse,
  AccountUsageParams,
  AccountUsageResponse,
  AccountUsageTransactionsParams,
  AccountUsageTransactionsResponse,
  AccountUsageTransaction,
  ListApiKeysResponse,
  CreateApiKeyResponse,
  ListSignalsParams,
  IterateSignalsParams,
  SignalsResponse,
  SignalRecord,
  SignalCatalogResponse,
  SignalDetailResponse,
  MonitoringPricingResponse,
  MonitorsResponse,
  MonitorResponse,
  CreateMonitorParams,
  WebhookEndpointsResponse,
  CreateWebhookEndpointParams,
  WebhookEndpointResponse,
  WebhookDeliveriesResponse,
  WebhookDeliveryResponse,
  WebhookEventsResponse,
  IterateSearchOrganizationsParams,
  SearchResultItem,
} from './types.js';
import {
  HandelsregisterError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  RequestTimeoutError,
  InvalidResponseError,
  NetworkError,
  RateLimitError,
  ValidationError,
  RequestValidationError,
  InsufficientCreditsError,
  SubscriptionRequiredError,
  ConflictError,
  IdempotencyConflictError,
  IdempotencyKeyRequiredError,
  ServerError,
  ServiceUnavailableError,
} from './errors.js';
import {
  INSOLVENCY_STATUSES,
  LEGAL_FORM_LIABILITY_TYPES,
  MONITOR_MAX_POLL_INTERVAL_DAYS,
  MONITOR_MIN_POLL_INTERVAL_DAYS,
  ORGANIZATION_STATUSES,
  OWNERSHIP_STRUCTURES,
  SEARCH_ORGANIZATIONS_MAX_LIMIT,
  SEARCH_ORGANIZATIONS_MAX_QUERY_LENGTH,
  SEARCH_SORT_FIELDS,
  SIGNAL_TOPICS,
  SORT_ORDERS,
} from './constants.js';
import { Cache, generateCacheKey } from './utils/cache.js';
import { retry, sleep } from './utils/retry.js';
import { FileRecord, readFile, writeFile } from './utils/fileHandler.js';
import { version } from './version.js';

const DEFAULT_BASE_URL = 'https://handelsregister.ai/api/v1/';
const DEFAULT_TIMEOUT = 90000; // 90 seconds
const USER_AGENT = `handelsregister-js/${version}`;
const DOCUMENT_TYPES: DocumentType[] = [
  'shareholders_list',
  'articles_of_association',
  'AD',
  'CD',
  'SI',
];
const RESERVED_HEADERS = new Set(['authorization', 'x-api-key', 'user-agent']);
const HTTP_HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MONITOR_ID = /^mon_[a-z0-9]{26}$/;
const WEBHOOK_ENDPOINT_ID = /^wep_[a-z0-9]{26}$/;
const WEBHOOK_DELIVERY_ID = /^del_[a-z0-9]{26}$/;
const MONITOR_ENTITY_ID = /^[A-Za-z0-9._~-]{1,128}$/;
const FINANCIAL_FILTER_KEYS = new Set([
  'emp_count',
  'bs_assets_total',
  'bs_equity_total',
  'bs_liabilities_total',
  'bs_cash_and_equivalents',
  'bs_cash_to_liabilities',
  'bs_equity_ratio',
  'bs_debt_to_assets',
  'pl_revenue',
  'pl_net_income',
  'pl_ebit',
]);

interface RequestRetryOptions {
  retryable?: boolean;
  networkIo?: boolean;
  mutation?: boolean;
  maxAttempts?: number;
}

function serializeQueryValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value.toString();
  }

  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new ValidationError('Unsupported query parameter value');
  }
  return serialized;
}

function makeMultiFeatureSerializer() {
  return (params: Record<string, unknown>): string => {
    const parts: string[] = [];
    for (const key in params) {
      const value = params[key];
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        // Repeated parameter (e.g., feature=a&feature=b)
        const wireKey = key === 'features' ? 'feature' : key;
        value.forEach((v) =>
          parts.push(
            `${encodeURIComponent(wireKey)}=${encodeURIComponent(
              serializeQueryValue(v),
            )}`,
          ),
        );
      } else {
        parts.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(
            serializeQueryValue(value),
          )}`,
        );
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
  public lastIdempotencyStatus?: string;

  constructor(config: HandelsregisterConfig | string = {}) {
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

    const baseURL =
      config.baseUrl || process.env.HANDELSREGISTER_BASE_URL || DEFAULT_BASE_URL;
    const timeout = config.timeout || DEFAULT_TIMEOUT;

    let extraHeaders = config.extraHeaders;
    if (extraHeaders === undefined && process.env.HANDELSREGISTER_EXTRA_HEADERS) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(process.env.HANDELSREGISTER_EXTRA_HEADERS);
      } catch {
        throw new ValidationError(
          'HANDELSREGISTER_EXTRA_HEADERS must contain a JSON object',
        );
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new ValidationError(
          'HANDELSREGISTER_EXTRA_HEADERS must contain a JSON object',
        );
      }
      extraHeaders = parsed as Record<string, string>;
    }

    const headers: Record<string, string> = {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    };
    if (extraHeaders !== undefined) {
      if (!extraHeaders || typeof extraHeaders !== 'object' || Array.isArray(extraHeaders)) {
        throw new ValidationError('extraHeaders must be an object');
      }
      for (const [rawName, value] of Object.entries(extraHeaders)) {
        const name = rawName.trim();
        if (!name || !HTTP_HEADER_NAME.test(name)) {
          throw new ValidationError(
            'Extra header names must use valid HTTP token characters',
          );
        }
        if (RESERVED_HEADERS.has(name.toLowerCase())) {
          throw new ValidationError(
            `Header '${name}' is managed by the SDK and cannot be overridden`,
          );
        }
        if (typeof value !== 'string' || !value || /[\r\n]/.test(value)) {
          throw new ValidationError(
            `Extra header '${name}' must have a non-empty single-line string value`,
          );
        }
        headers[name] = value;
      }
    }
    if (this.bearerToken) {
      headers['Authorization'] = `Bearer ${this.bearerToken}`;
    } else if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    this.httpClient = axios.create({
      baseURL,
      timeout,
      headers,
      maxRedirects: 0,
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
    options: boolean | RequestRetryOptions = {},
  ): Promise<AxiosResponse<T>> {
    const resolved: RequestRetryOptions =
      typeof options === 'boolean' ? { retryable: options } : options;
    try {
      return await retry(
        async () => {
          if (this.rateLimit && this.rateLimit > 0) {
            await sleep(this.rateLimit * 1000);
          }
          return await fn();
        },
        {
          maxAttempts: resolved.maxAttempts ?? 3,
          shouldRetry: (error: unknown) => {
            if (resolved.retryable === false) return false;
            if (!axios.isAxiosError(error)) return false;
            if (!error.response) return true; // Network errors
            const status = error.response.status;
            if (status === 409) return false;
            if (resolved.networkIo) {
              return (
                status === 429 ||
                (status === 503 &&
                  this.normalizedErrorCode(error.response.data) ===
                    'TEMPORARILY_UNAVAILABLE')
              );
            }
            if (resolved.mutation && status === 408) return true;
            return status === 429 || status >= 500;
          },
          getDelay: (error: unknown, _attempt: number, defaultDelay: number) =>
            this.retryDelay(error, defaultDelay),
        },
      );
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof HandelsregisterError) return error;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<unknown>;
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data;
        const responseHeaders = this.responseHeaders(axiosError.response.headers);
        const message = this.extractErrorMessage(
          data,
          `API request failed with status ${status}`,
        );
        const errorCode = this.extractErrorCode(data);
        const normalizedCode = this.normalizedErrorCode(data);
        if (status === 400 || status === 422) {
          return new RequestValidationError(
            message,
            data,
            status,
            errorCode,
            responseHeaders,
          );
        }
        if (status === 401) {
          return new AuthenticationError(message, data, responseHeaders);
        }
        if (status === 402) {
          return new InsufficientCreditsError(message, data, responseHeaders);
        }
        if (status === 403) {
          if (
            normalizedCode === 'PLAN_REQUIRED' ||
            normalizedCode === 'SUBSCRIPTION_REQUIRED'
          ) {
            return new SubscriptionRequiredError(
              message,
              data,
              errorCode,
              responseHeaders,
            );
          }
          return new ForbiddenError(message, data, errorCode, responseHeaders);
        }
        if (status === 404) {
          return new NotFoundError(message, data, responseHeaders);
        }
        if (status === 408) {
          return new RequestTimeoutError(message, data, responseHeaders);
        }
        if (status === 409) {
          if (normalizedCode.startsWith('IDEMPOTENCY')) {
            return new IdempotencyConflictError(
              message,
              data,
              errorCode,
              responseHeaders,
            );
          }
          return new ConflictError(message, data, errorCode, responseHeaders);
        }
        if (status === 428) {
          return new IdempotencyKeyRequiredError(
            message,
            data,
            errorCode,
            responseHeaders,
          );
        }
        if (status === 429) {
          const retryAfterHeader = this.getResponseHeader(
            axiosError.response.headers,
            'retry-after',
          );
          const retryAfter =
            retryAfterHeader !== undefined
              ? Number(retryAfterHeader)
              : undefined;
          return new RateLimitError(
            message,
            Number.isFinite(retryAfter) ? retryAfter : undefined,
            data,
            responseHeaders,
          );
        }
        if (status === 503 && normalizedCode === 'TEMPORARILY_UNAVAILABLE') {
          return new ServiceUnavailableError(
            message,
            data,
            errorCode,
            responseHeaders,
          );
        }
        if (status >= 500) {
          return new ServerError(
            message,
            status,
            data,
            errorCode,
            responseHeaders,
          );
        }
        if (status >= 300 && status < 400) {
          const location = responseHeaders.location;
          return new HandelsregisterError(
            `Unexpected HTTP ${status} redirect${location ? ` to ${location}` : ''}; the API returned a browser response instead of JSON.`,
            status,
            data,
            errorCode,
            responseHeaders,
          );
        }
        return new HandelsregisterError(
          message,
          status,
          data,
          errorCode,
          responseHeaders,
        );
      } else if (axiosError.request) {
        return new NetworkError(
          'Network error: No response received from server',
          axiosError,
        );
      }
    }

    return new HandelsregisterError('An unexpected error occurred', undefined, error);
  }

  private extractErrorMessage(data: unknown, fallback: string): string {
    if (typeof data === 'string') {
      const value = data.trim();
      if (value && !value.startsWith('<')) return value;
      return fallback;
    }
    if (!data || typeof data !== 'object') return fallback;

    const response = data as Record<string, unknown>;
    if (response.error && typeof response.error === 'object') {
      const errorObject = response.error as Record<string, unknown>;
      for (const key of ['message', 'detail', 'title', 'code']) {
        const value = errorObject[key];
        if (typeof value === 'string' && value) return value;
      }
    }

    const meta = response.meta;
    if (meta && typeof meta === 'object') {
      const message = (meta as Record<string, unknown>).message;
      if (typeof message === 'string') return message;
    }

    const detail = response.detail;
    if (typeof detail === 'string' && detail) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const messages = detail
        .filter((item): item is Record<string, unknown> =>
          Boolean(item && typeof item === 'object' && !Array.isArray(item)),
        )
        .map((item) => item.msg)
        .filter((message): message is string => typeof message === 'string');
      if (messages.length > 0) return messages.join('; ');
    }
    for (const key of ['message', 'title']) {
      const value = response[key];
      if (typeof value === 'string' && value) return value;
    }

    if (typeof response.error === 'string' && response.error) return response.error;
    if (typeof response.code === 'string' && response.code) return response.code;

    return fallback;
  }

  private extractErrorCode(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') return undefined;
    const response = data as Record<string, unknown>;
    const error = response.error;
    const candidates = [
      response.code,
      response.error_code,
      error && typeof error === 'object'
        ? (error as Record<string, unknown>).code
        : error,
    ];
    return candidates.find(
      (candidate): candidate is string =>
        typeof candidate === 'string' && candidate.length > 0,
    );
  }

  private normalizedErrorCode(data: unknown): string {
    return (this.extractErrorCode(data) || '').toUpperCase();
  }

  private responseHeaders(headers: unknown): Record<string, string> {
    if (!headers || typeof headers !== 'object') return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) result[key.toLowerCase()] = String(value);
    }
    return result;
  }

  private getResponseHeader(
    headers: unknown,
    name: string,
  ): string | undefined {
    if (!headers || typeof headers !== 'object') return undefined;
    const record = headers as Record<string, unknown>;
    const direct = record[name];
    if (typeof direct === 'string' || typeof direct === 'number') {
      return String(direct);
    }

    const get = record.get;
    if (typeof get !== 'function') return undefined;
    const value: unknown = (
      get as (this: object, headerName: string) => unknown
    ).call(headers, name);
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : undefined;
  }

  private retryDelay(error: unknown, defaultDelay: number): number {
    if (!axios.isAxiosError(error) || !error.response) return defaultDelay;
    const retryAfter = this.getResponseHeader(error.response.headers, 'retry-after');
    if (retryAfter === undefined) return defaultDelay;
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const retryAt = Date.parse(retryAfter);
    return Number.isNaN(retryAt)
      ? defaultDelay
      : Math.max(0, retryAt - Date.now());
  }

  // ------------------------------------------------------------------
  // fetch-organization
  // ------------------------------------------------------------------

  private async networkSubscriptionAccess(): Promise<boolean | undefined> {
    let account: AccountSubscriptionResponse;
    try {
      account = await this.getAccountSubscription();
    } catch (error) {
      if (error instanceof HandelsregisterError) return undefined;
      throw error;
    }

    if (Object.prototype.hasOwnProperty.call(account, 'subscription')) {
      if (account.subscription === null) return false;
      if (!account.subscription || typeof account.subscription !== 'object') {
        return undefined;
      }
      const plan = account.subscription.plan;
      if (typeof plan !== 'string' || !plan.trim()) return undefined;
      return ['pro', 'max'].includes(plan.trim().toLowerCase());
    }

    // Retain compatibility with the older direct `{ plan: "max" }` shape.
    if (typeof account.plan !== 'string' || !account.plan.trim()) {
      return undefined;
    }
    return ['pro', 'max'].includes(account.plan.trim().toLowerCase());
  }

  private async requireNetworkSubscription(): Promise<void> {
    if ((await this.networkSubscriptionAccess()) !== false) return;
    const message =
      "The 'network' feature requires an active Pro or Max subscription.";
    const payload = {
      error: 'subscription_required',
      meta: {
        message,
        required_plans: ['pro', 'max'],
        blocked_features: ['network'],
        request_credit_cost: 0,
      },
    };
    throw new SubscriptionRequiredError(
      message,
      payload,
      'subscription_required',
    );
  }

  async fetchOrganization(params: SearchParams | string): Promise<CompanyData> {
    const searchParams: SearchParams =
      typeof params === 'string' ? { q: params } : params;

    const query = (searchParams.q || '').trim();
    if (!query) {
      throw new ValidationError('Search query (q) is required');
    }
    const features = Array.from(new Set(searchParams.features || []));
    if (
      searchParams.realtimeMode &&
      features.some(
        (feature) => feature === 'related_persons' || feature === 'publications',
      )
    ) {
      throw new ValidationError(
        'realtimeMode cannot be combined with related_persons or publications',
      );
    }

    const cacheKey = this.cache && !searchParams.realtimeMode
      ? generateCacheKey({
          kind: 'organization',
          q: query,
          features,
          ai_search: this.normalizeAiSearch(searchParams.aiSearch),
          realtime_mode: this.normalizeRealtimeMode(searchParams.realtimeMode),
        })
      : null;

    if (cacheKey && this.cache?.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached as CompanyData;
    }

    // Accounts below Pro currently receive a billable base profile while the
    // service silently omits `network`. The free Account API lets the SDK fail
    // clearly before making that organization request.
    if (features.includes('network')) {
      await this.requireNetworkSubscription();
    }

    const queryParams: Record<string, unknown> = { q: query };

    if (features.length > 0) {
      queryParams['feature'] = features;
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

    const companyData = response.data;
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
    const filters = p.filters
      ? this.prepareSearchFilters(p.filters)
      : undefined;
    const hasFilters = !!filters && Object.keys(filters).length > 0;
    if (!q && !hasFilters) {
      throw new ValidationError('Either q or at least one filter is required');
    }
    if (q && q.length < 2) {
      throw new ValidationError('Search query (q) must be at least 2 characters');
    }
    if (q && q.length > SEARCH_ORGANIZATIONS_MAX_QUERY_LENGTH) {
      throw new ValidationError(
        `Search query (q) must be at most ${SEARCH_ORGANIZATIONS_MAX_QUERY_LENGTH} characters`,
      );
    }
    if (p.limit !== undefined && (p.limit < 1 || p.limit > 30)) {
      throw new ValidationError('limit must be between 1 and 30');
    }
    if (p.skip !== undefined && p.skip < 0) {
      throw new ValidationError('skip must be >= 0');
    }
    const sort = this.normalizeChoice('sort', p.sort, SEARCH_SORT_FIELDS);
    const order = this.normalizeChoice('order', p.order, SORT_ORDERS);
    if (p.matchContext !== undefined && typeof p.matchContext !== 'boolean') {
      throw new ValidationError('matchContext must be a boolean');
    }
    if (sort === 'distance' && !filters?.location_coordinates) {
      throw new ValidationError(
        "sort='distance' requires filters.location_coordinates",
      );
    }
    const cacheKey = this.cache
      ? generateCacheKey({
          kind: 'search',
          q,
          skip: p.skip ?? 0,
          limit: p.limit ?? 10,
          filters: filters ? JSON.stringify(filters) : '',
          ai_mode: this.normalizeSearchAiMode(p.aiMode),
          sort,
          order,
          match_context: p.matchContext,
        })
      : null;

    if (cacheKey && this.cache?.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached as SearchOrganizationsResponse;
    }

    const queryParams: Record<string, unknown> = {};
    if (q) queryParams.q = q;
    if (p.skip !== undefined) queryParams.skip = p.skip;
    if (p.limit !== undefined) queryParams.limit = p.limit;
    if (filters) queryParams.filters = JSON.stringify(filters);
    const aiMode = this.normalizeSearchAiMode(p.aiMode);
    if (aiMode) queryParams.ai_mode = aiMode;
    if (sort) queryParams.sort = sort;
    if (order) queryParams.order = order;
    if (p.matchContext !== undefined) {
      queryParams.match_context = Number(p.matchContext);
    }

    const response = await this.requestWithRetry<SearchOrganizationsResponse>(() =>
      this.httpClient.get('/search-organizations', { params: queryParams }),
    );

    const data = response.data;
    if (
      !data ||
      typeof data !== 'object' ||
      !Array.isArray(data.results) ||
      typeof data.total !== 'number'
    ) {
      throw new InvalidResponseError(
        'Invalid search-organizations response format',
        data,
      );
    }
    if (cacheKey && this.cache) this.cache.set(cacheKey, data);
    return data;
  }

  private normalizeSearchAiMode(
    value: SearchOrganizationsParams['aiMode'],
  ): 'on-default' | undefined {
    return value === true || value === 'on-default' ? 'on-default' : undefined;
  }

  private normalizeChoice(
    name: string,
    value: unknown,
    allowed: readonly string[],
  ): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string' || !value.trim()) {
      throw new ValidationError(`${name} must be a non-empty string`);
    }
    const normalized = value.trim();
    if (!allowed.includes(normalized)) {
      throw new ValidationError(
        `${name} must be one of: ${allowed.join(', ')}`,
      );
    }
    return normalized;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  private validateConditionObject(
    group: string,
    field: string,
    value: unknown,
  ): void {
    if (!this.isRecord(value)) return;
    const keys = Object.keys(value);
    if (keys.length === 0) {
      throw new ValidationError(
        `Filter '${group}.${field}' condition must not be empty`,
      );
    }
    const allowed = new Set(['gte', 'lte', 'gt', 'lt', 'eq', 'exists']);
    const unknown = keys.filter((key) => !allowed.has(key)).sort();
    if (unknown.length > 0) {
      throw new ValidationError(
        `Filter '${group}.${field}' contains unsupported operators: ${unknown.join(', ')}`,
      );
    }
    if ('exists' in value && typeof value.exists !== 'boolean') {
      throw new ValidationError(
        `Filter '${group}.${field}.exists' must be a boolean`,
      );
    }
  }

  private conditionValues(value: unknown): unknown[] {
    const values = this.isRecord(value)
      ? Object.entries(value)
          .filter(([key]) => key !== 'exists')
          .map(([, item]) => item)
      : Array.isArray(value)
        ? value
        : [value];
    const flattened: unknown[] = [];
    for (const item of values) {
      if (Array.isArray(item)) {
        for (const nested of item as unknown[]) flattened.push(nested);
      } else {
        flattened.push(item);
      }
    }
    return flattened;
  }

  private validateAdvancedFilterGroup(
    group: string,
    value: unknown,
    allowedFields: readonly string[],
  ): Record<string, unknown> {
    if (!this.isRecord(value)) {
      throw new ValidationError(`Filter '${group}' must be an object`);
    }
    const fields = Object.keys(value);
    if (fields.length === 0) {
      throw new ValidationError(`Filter '${group}' must not be empty`);
    }
    const allowed = new Set(allowedFields);
    const unknown = fields.filter((field) => !allowed.has(field)).sort();
    if (unknown.length > 0) {
      throw new ValidationError(
        `Filter '${group}' contains unsupported fields: ${unknown.join(', ')}`,
      );
    }
    for (const [field, condition] of Object.entries(value)) {
      this.validateConditionObject(group, field, condition);
    }
    return { ...value };
  }

  private prepareSearchFilters(
    filters: SearchOrganizationFilters,
  ): SearchOrganizationFilters {
    if (!this.isRecord(filters)) {
      throw new ValidationError('filters must be an object');
    }
    const data: Record<string, unknown> = { ...filters };

    if (
      data.legal_form_code !== undefined &&
      (typeof data.legal_form_code !== 'string' ||
        !data.legal_form_code.trim())
    ) {
      throw new ValidationError(
        'legal_form_code must be one non-empty string',
      );
    }
    if (data.active !== undefined && typeof data.active !== 'boolean') {
      throw new ValidationError('active must be a boolean');
    }
    this.normalizeChoice('status', data.status, ORGANIZATION_STATUSES);
    this.normalizeChoice(
      'legal_form_liability_type',
      data.legal_form_liability_type,
      LEGAL_FORM_LIABILITY_TYPES,
    );

    if (
      data.company_size_category !== undefined &&
      (typeof data.company_size_category !== 'string' ||
        !['micro', 'small', 'medium', 'large'].includes(
          data.company_size_category,
        ))
    ) {
      throw new ValidationError(
        'company_size_category must be one of: micro, small, medium, large',
      );
    }

    const existingFinancial = data.financial_filters;
    if (existingFinancial !== undefined && !this.isRecord(existingFinancial)) {
      throw new ValidationError('financial_filters must be an object');
    }
    const financialFilters: Record<string, unknown> = existingFinancial
      ? { ...existingFinancial }
      : {};
    delete data.financial_filters;
    for (const key of FINANCIAL_FILTER_KEYS) {
      if (data[key] !== undefined) {
        financialFilters[key] = data[key];
        delete data[key];
      }
    }
    for (const [key, value] of Object.entries(financialFilters)) {
      if (!this.isRecord(value) || Object.keys(value).length === 0) {
        throw new ValidationError(
          `Financial range filter '${key}' must be a non-empty object`,
        );
      }
      const unknown = Object.keys(value)
        .filter((rangeKey) => rangeKey !== 'gte' && rangeKey !== 'lte')
        .sort();
      if (unknown.length > 0) {
        throw new ValidationError(
          `Financial range filter '${key}' contains unsupported keys: ${unknown.join(', ')}`,
        );
      }
    }
    if (Object.keys(financialFilters).length > 0) {
      data.financial_filters = financialFilters;
    }

    if (
      data.company_size_category !== undefined &&
      data.emp_size_category === undefined
    ) {
      data.emp_size_category = data.company_size_category;
      delete data.company_size_category;
    }

    const rawCoordinates = data.location_coordinates;
    if (rawCoordinates !== undefined) {
      let coordinates: Record<string, unknown>;
      if (Array.isArray(rawCoordinates)) {
        if (rawCoordinates.length !== 2) {
          throw new ValidationError(
            "location_coordinates must contain exactly 'lat' and 'lon'",
          );
        }
        coordinates = { lat: rawCoordinates[0], lon: rawCoordinates[1] };
      } else if (this.isRecord(rawCoordinates)) {
        coordinates = { ...rawCoordinates };
        if (coordinates.lat === undefined && coordinates.latitude !== undefined) {
          coordinates.lat = coordinates.latitude;
        }
        if (coordinates.lon === undefined && coordinates.longitude !== undefined) {
          coordinates.lon = coordinates.longitude;
        }
        delete coordinates.latitude;
        delete coordinates.longitude;
      } else {
        throw new ValidationError('location_coordinates must be an object');
      }
      const coordinateKeys = Object.keys(coordinates).sort();
      if (
        coordinateKeys.length !== 2 ||
        !coordinateKeys.includes('lat') ||
        !coordinateKeys.includes('lon')
      ) {
        throw new ValidationError(
          "location_coordinates must contain exactly 'lat' and 'lon'",
        );
      }
      const lat = coordinates.lat;
      const lon = coordinates.lon;
      if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
        throw new ValidationError("location coordinate 'lat' must be between -90 and 90");
      }
      if (typeof lon !== 'number' || !Number.isFinite(lon) || lon < -180 || lon > 180) {
        throw new ValidationError(
          "location coordinate 'lon' must be between -180 and 180",
        );
      }
      data.location_coordinates = { lat, lon };
    }

    const distance = data.location_max_distance_km;
    if (distance !== undefined) {
      if (rawCoordinates === undefined) {
        throw new ValidationError(
          'location_max_distance_km requires location_coordinates',
        );
      }
      if (
        typeof distance !== 'number' ||
        !Number.isFinite(distance) ||
        distance < 1 ||
        distance > 100
      ) {
        throw new ValidationError(
          'location_max_distance_km must be between 1 and 100',
        );
      }
    } else if (rawCoordinates !== undefined) {
      throw new ValidationError(
        'location_coordinates requires location_max_distance_km',
      );
    }

    const advancedGroups: Record<string, readonly string[]> = {
      ownership_filters: [
        'structure',
        'owner_managed',
        'likely_family_owned',
        'largest_share_ratio',
        'oldest_owner_birth_date',
        'youngest_owner_birth_date',
      ],
      executive_filters: [
        'md_oldest_birth_date',
        'md_youngest_birth_date',
      ],
      lifecycle_filters: [
        'insolvency_active',
        'insolvency_status',
        'insolvency_opened_date',
      ],
    };
    for (const [group, allowedFields] of Object.entries(advancedGroups)) {
      if (data[group] !== undefined) {
        data[group] = this.validateAdvancedFilterGroup(
          group,
          data[group],
          allowedFields,
        );
      }
    }

    const ownership = data.ownership_filters;
    if (this.isRecord(ownership) && ownership.structure !== undefined) {
      for (const value of this.conditionValues(ownership.structure)) {
        if (!OWNERSHIP_STRUCTURES.includes(value as never)) {
          throw new ValidationError(
            `ownership_filters.structure contains an unsupported value: ${String(value)}`,
          );
        }
      }
    }
    if (this.isRecord(ownership) && ownership.largest_share_ratio !== undefined) {
      for (const value of this.conditionValues(ownership.largest_share_ratio)) {
        if (
          typeof value !== 'number' ||
          !Number.isFinite(value) ||
          value < 0 ||
          value > 1
        ) {
          throw new ValidationError(
            'ownership_filters.largest_share_ratio values must be between 0 and 1',
          );
        }
      }
    }

    const lifecycle = data.lifecycle_filters;
    if (this.isRecord(lifecycle) && lifecycle.insolvency_status !== undefined) {
      for (const value of this.conditionValues(lifecycle.insolvency_status)) {
        if (!INSOLVENCY_STATUSES.includes(value as never)) {
          throw new ValidationError(
            `lifecycle_filters.insolvency_status contains an unsupported value: ${String(value)}`,
          );
        }
      }
    }

    return data;
  }

  async *iterateSearchOrganizations(
    params: IterateSearchOrganizationsParams,
  ): AsyncGenerator<SearchResultItem> {
    const pageSize = params.pageSize ?? SEARCH_ORGANIZATIONS_MAX_LIMIT;
    const maxResults = params.maxResults;
    const initialSkip = params.skip ?? 0;
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 30) {
      throw new ValidationError('pageSize must be an integer between 1 and 30');
    }
    if (!Number.isInteger(initialSkip) || initialSkip < 0) {
      throw new ValidationError('skip must be a non-negative integer');
    }
    if (
      maxResults !== undefined &&
      (!Number.isInteger(maxResults) || maxResults < 0)
    ) {
      throw new ValidationError('maxResults must be a non-negative integer');
    }
    if (maxResults === 0) return;

    let nextSkip = initialSkip;
    let yielded = 0;
    while (maxResults === undefined || yielded < maxResults) {
      const limit =
        maxResults === undefined
          ? pageSize
          : Math.min(pageSize, maxResults - yielded);
      const page = await this.searchOrganizations({
        q: params.q,
        filters: params.filters,
        aiMode: params.aiMode,
        sort: params.sort,
        order: params.order,
        matchContext: params.matchContext,
        skip: nextSkip,
        limit,
      });
      if (!Array.isArray(page.results)) {
        throw new InvalidResponseError(
          "search-organizations response must contain a 'results' array",
          page,
        );
      }
      if (page.results.length === 0) return;
      for (const result of page.results) {
        if (!result || typeof result !== 'object' || Array.isArray(result)) {
          throw new InvalidResponseError(
            'search-organizations results must be objects',
            page,
          );
        }
        yield result;
        yielded += 1;
        if (maxResults !== undefined && yielded >= maxResults) return;
      }
      nextSkip += page.results.length;
      if (nextSkip >= page.total || page.results.length < limit) return;
    }
  }

  iterSearchOrganizations(
    params: IterateSearchOrganizationsParams,
  ): AsyncGenerator<SearchResultItem> {
    return this.iterateSearchOrganizations(params);
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

    const queryParams: Record<string, unknown> = {
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
    if (!data || typeof data !== 'object') {
      throw new InvalidResponseError('Invalid fetch-person response format', data);
    }
    if (cacheKey && this.cache) this.cache.set(cacheKey, data);
    return data;
  }

  // ------------------------------------------------------------------
  // fetch-document
  // ------------------------------------------------------------------

  async fetchDocument(params: FetchDocumentParams): Promise<Buffer>;
  async fetchDocument(
    companyId: string,
    documentType: DocumentType,
    outputFile?: string,
  ): Promise<Buffer>;
  async fetchDocument(
    companyIdOrParams: string | FetchDocumentParams,
    documentType?: DocumentType,
    outputFile?: string,
  ): Promise<Buffer> {
    const document = await this.fetchDocumentWithMetadata(
      companyIdOrParams as string,
      documentType as DocumentType,
      outputFile,
    );
    return document.data;
  }

  async fetchDocumentWithMetadata(
    params: FetchDocumentParams,
  ): Promise<FetchedDocument>;
  async fetchDocumentWithMetadata(
    companyId: string,
    documentType: DocumentType,
    outputFile?: string,
  ): Promise<FetchedDocument>;
  async fetchDocumentWithMetadata(
    companyIdOrParams: string | FetchDocumentParams,
    documentType?: DocumentType,
    outputFile?: string,
  ): Promise<FetchedDocument> {
    const params =
      typeof companyIdOrParams === 'string'
        ? {
            companyId: companyIdOrParams,
            documentType: documentType as DocumentType,
            outputFile,
          }
        : companyIdOrParams;

    if (!params.companyId || params.companyId.trim() === '') {
      throw new ValidationError('Company ID is required');
    }

    if (!DOCUMENT_TYPES.includes(params.documentType)) {
      throw new ValidationError(
        `Invalid document type. Must be one of: ${DOCUMENT_TYPES.join(', ')}`,
      );
    }

    const response = await this.requestWithRetry<ArrayBuffer>(() =>
      this.httpClient.get('/fetch-document', {
        params: {
          company_id: params.companyId,
          document_type: params.documentType,
        },
        responseType: 'arraybuffer',
      }),
    );

    const buffer = Buffer.from(response.data);

    if (params.outputFile) {
      const absolutePath = path.resolve(params.outputFile);
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(absolutePath, buffer);
    }

    const contentType = this.getResponseHeader(
      response.headers,
      'content-type',
    );
    const disposition = this.getResponseHeader(
      response.headers,
      'content-disposition',
    );
    const fileName =
      typeof disposition === 'string'
        ? this.parseContentDispositionFileName(disposition)
        : undefined;

    return {
      data: buffer,
      documentType: params.documentType,
      contentType,
      fileName,
    };
  }

  private parseContentDispositionFileName(
    disposition: string,
  ): string | undefined {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1].trim());
      } catch {
        return utf8Match[1].trim();
      }
    }

    const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
    return plainMatch?.[1]?.trim();
  }

  private normalizeDate(value: string | Date | undefined, name: string): string | undefined {
    if (value === undefined) return undefined;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new ValidationError(`${name} must be a valid Date`);
      }
      return value.toISOString();
    }
    if (typeof value === 'string' && value.trim()) return value.trim();
    throw new ValidationError(`${name} must be a non-empty ISO 8601 string or Date`);
  }

  private normalizeCsv(
    value: string | ReadonlyArray<string> | undefined,
    name: string,
  ): string | undefined {
    if (value === undefined) return undefined;
    const raw = typeof value === 'string' ? value.split(',') : Array.from(value);
    const normalized = Array.from(
      new Set(raw.map((item) => String(item).trim()).filter(Boolean)),
    );
    if (normalized.length === 0) {
      throw new ValidationError(`${name} must not be empty`);
    }
    return normalized.join(',');
  }

  private async getJson<T>(
    path: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const response = await this.requestWithRetry<T>(() =>
      this.httpClient.get(path, { params }),
    );
    return response.data;
  }

  private idempotencyKey(value?: string): string {
    if (value === undefined) {
      return `sdk-js-${randomUUID().replace(/-/g, '')}`;
    }
    if (typeof value !== 'string' || !IDEMPOTENCY_KEY.test(value)) {
      throw new ValidationError(
        'idempotencyKey must be 1-128 ASCII characters, start with an alphanumeric character, and contain only [A-Za-z0-9._:-]',
      );
    }
    return value;
  }

  private async mutate<T>(
    method: 'POST' | 'PATCH' | 'DELETE',
    path: string,
    options: {
      body?: Record<string, unknown>;
      idempotencyKey?: string;
      networkIo?: boolean;
      verifiedResultOn422?: boolean;
    } = {},
  ): Promise<T> {
    const key = this.idempotencyKey(options.idempotencyKey);
    this.lastIdempotencyStatus = undefined;
    const response = await this.requestWithRetry<T>(
      async () => {
        try {
          return await this.httpClient.request<T>({
            method,
            url: path,
            data: options.body,
            headers: { 'Idempotency-Key': key },
          });
        } catch (error) {
          if (
            options.verifiedResultOn422 &&
            axios.isAxiosError<T>(error) &&
            error.response?.status === 422 &&
            error.response.data &&
            typeof error.response.data === 'object' &&
            'verified' in error.response.data
          ) {
            return error.response;
          }
          throw error;
        }
      },
      {
        mutation: true,
        networkIo: options.networkIo,
      },
    );
    this.lastIdempotencyStatus = this.getResponseHeader(
      response.headers,
      'idempotency-status',
    );
    return response.data === undefined || response.data === ''
      ? ({} as T)
      : response.data;
  }

  private validatePublicId(
    value: string,
    pattern: RegExp,
    name: string,
    example: string,
  ): string {
    if (typeof value !== 'string' || !pattern.test(value)) {
      throw new ValidationError(`${name} must be a public id like '${example}'`);
    }
    return value;
  }

  private validatePollInterval(value: number): number {
    if (
      !Number.isInteger(value) ||
      value < MONITOR_MIN_POLL_INTERVAL_DAYS ||
      value > MONITOR_MAX_POLL_INTERVAL_DAYS
    ) {
      throw new ValidationError(
        `pollIntervalDays must be an integer between ${MONITOR_MIN_POLL_INTERVAL_DAYS} and ${MONITOR_MAX_POLL_INTERVAL_DAYS}`,
      );
    }
    return value;
  }

  // ------------------------------------------------------------------
  // Account and usage
  // ------------------------------------------------------------------

  async getAccount(): Promise<AccountResponse> {
    return this.getJson('/account');
  }

  async getAccountCredits(): Promise<AccountCreditsResponse> {
    return this.getJson('/account/credits');
  }

  async getAccountUsage(
    params: AccountUsageParams = {},
  ): Promise<AccountUsageResponse> {
    const query: Record<string, unknown> = {};
    const fromDate = this.normalizeDate(params.fromDate, 'fromDate');
    const toDate = this.normalizeDate(params.toDate, 'toDate');
    if (fromDate) query.from = fromDate;
    if (toDate) query.to = toDate;
    if (params.groupBy !== undefined) {
      const groupBy = String(params.groupBy).trim().toLowerCase();
      if (groupBy !== 'day' && groupBy !== 'month') {
        throw new ValidationError("groupBy must be 'day' or 'month'");
      }
      query.group_by = groupBy;
    }
    return this.getJson('/account/usage', query);
  }

  async getAccountUsageTransactions(
    params: AccountUsageTransactionsParams = {},
  ): Promise<AccountUsageTransactionsResponse> {
    const query: Record<string, unknown> = {};
    const fromDate = this.normalizeDate(params.fromDate, 'fromDate');
    const toDate = this.normalizeDate(params.toDate, 'toDate');
    if (fromDate) query.from = fromDate;
    if (toDate) query.to = toDate;
    if (params.endpoint !== undefined) {
      const endpoint = params.endpoint.trim();
      if (!endpoint) throw new ValidationError('endpoint must not be empty');
      query.endpoint = endpoint;
    }
    if (params.perPage !== undefined) {
      if (
        !Number.isInteger(params.perPage) ||
        params.perPage < 1 ||
        params.perPage > 100
      ) {
        throw new ValidationError('perPage must be an integer between 1 and 100');
      }
      query.per_page = params.perPage;
    }
    if (params.cursor !== undefined) {
      const cursor = params.cursor.trim();
      if (!cursor) throw new ValidationError('cursor must not be empty');
      query.cursor = cursor;
    }
    return this.getJson('/account/usage/transactions', query);
  }

  async *iterateAccountUsageTransactions(
    params: Omit<AccountUsageTransactionsParams, 'cursor'> = {},
  ): AsyncGenerator<AccountUsageTransaction> {
    let cursor: string | undefined;
    const seenCursors = new Set<string>();
    while (true) {
      const page = await this.getAccountUsageTransactions({ ...params, cursor });
      if (!Array.isArray(page.transactions) || !page.pagination) {
        throw new InvalidResponseError(
          'Account transactions response must contain transactions and pagination',
          page,
        );
      }
      for (const transaction of page.transactions) {
        if (!transaction || typeof transaction !== 'object' || Array.isArray(transaction)) {
          throw new InvalidResponseError(
            'Account transaction entries must be objects',
            page,
          );
        }
        yield transaction;
      }
      const nextCursor = page.pagination.next_cursor;
      if (page.pagination.has_more === false || !nextCursor) return;
      if (seenCursors.has(nextCursor)) {
        throw new InvalidResponseError(
          'Account transactions pagination repeated a cursor',
          page,
        );
      }
      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }
  }

  iterAccountUsageTransactions(
    params: Omit<AccountUsageTransactionsParams, 'cursor'> = {},
  ): AsyncGenerator<AccountUsageTransaction> {
    return this.iterateAccountUsageTransactions(params);
  }

  async getAccountSubscription(): Promise<AccountSubscriptionResponse> {
    return this.getJson('/account/subscription');
  }

  async listApiKeys(): Promise<ListApiKeysResponse> {
    return this.getJson('/account/api-keys');
  }

  async createApiKey(): Promise<CreateApiKeyResponse> {
    if (!this.bearerToken) {
      throw new AuthenticationError(
        "Creating an API key requires a Bearer token with the 'account:keys' ability",
      );
    }
    const response = await this.requestWithRetry<CreateApiKeyResponse>(
      () => this.httpClient.post('/account/api-keys'),
      false,
    );
    return response.data;
  }

  async revokeApiKey(apiKeyId: string | number): Promise<AccountResponse> {
    if (!this.bearerToken) {
      throw new AuthenticationError(
        "Revoking an API key requires a Bearer token with the 'account:keys' ability",
      );
    }
    const id = String(apiKeyId).trim();
    if (!id) throw new ValidationError('apiKeyId is required');
    const response = await this.requestWithRetry<AccountResponse>(() =>
      this.httpClient.delete(`/account/api-keys/${encodeURIComponent(id)}`),
    );
    return response.data ?? {};
  }

  // ------------------------------------------------------------------
  // Signals
  // ------------------------------------------------------------------

  async listSignals(params: ListSignalsParams = {}): Promise<SignalsResponse> {
    const query: Record<string, unknown> = {};
    if (params.cursor !== undefined) {
      const cursor = params.cursor.trim();
      if (!cursor) throw new ValidationError('cursor must not be empty');
      query.cursor = cursor;
    }
    const topics = this.normalizeCsv(params.topics, 'topics');
    if (topics) {
      const unknown = topics
        .split(',')
        .filter((topic) => !(SIGNAL_TOPICS as readonly string[]).includes(topic));
      if (unknown.length > 0) {
        throw new ValidationError(
          `Unsupported signal topics: ${unknown.join(', ')}. Valid values are: ${SIGNAL_TOPICS.join(', ')}`,
        );
      }
      query.topics = topics;
    }
    const organizationIds = this.normalizeCsv(
      params.organizationIds,
      'organizationIds',
    );
    if (organizationIds) query.organization_ids = organizationIds;
    const fromDate = this.normalizeDate(params.fromDate, 'fromDate');
    const toDate = this.normalizeDate(params.toDate, 'toDate');
    if (fromDate) query.from = fromDate;
    if (toDate) query.to = toDate;
    return this.getJson('/signals', query);
  }

  async *iterateSignals(
    params: IterateSignalsParams = {},
  ): AsyncGenerator<SignalRecord> {
    if (
      params.maxResults !== undefined &&
      (!Number.isInteger(params.maxResults) || params.maxResults < 1)
    ) {
      throw new ValidationError('maxResults must be an integer of at least 1');
    }
    let cursor: string | undefined;
    let yielded = 0;
    const seenCursors = new Set<string>();
    while (true) {
      const page = await this.listSignals({ ...params, cursor });
      if (!Array.isArray(page.signals) || !page.pagination) {
        throw new InvalidResponseError(
          'Signals response must contain signals and pagination',
          page,
        );
      }
      for (const signal of page.signals) {
        if (!signal || typeof signal !== 'object' || Array.isArray(signal)) {
          throw new InvalidResponseError('Signal entries must be objects', page);
        }
        yield signal;
        yielded += 1;
        if (params.maxResults !== undefined && yielded >= params.maxResults) return;
      }
      const nextCursor = page.pagination.next_cursor;
      if (!page.pagination.has_more || !nextCursor) return;
      if (seenCursors.has(nextCursor)) {
        throw new InvalidResponseError('Signals pagination repeated a cursor', page);
      }
      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }
  }

  iterSignals(params: IterateSignalsParams = {}): AsyncGenerator<SignalRecord> {
    return this.iterateSignals(params);
  }

  async getSignalCatalog(): Promise<SignalCatalogResponse> {
    return this.getJson('/signals/catalog');
  }

  async getSignal(signalId: string): Promise<SignalDetailResponse> {
    const id = String(signalId).trim();
    if (!id) throw new ValidationError('signalId is required');
    return this.getJson(`/signals/${encodeURIComponent(id)}`);
  }

  // ------------------------------------------------------------------
  // Monitoring and webhook management
  // ------------------------------------------------------------------

  async getMonitoringPricing(
    pollIntervalDays?: number,
  ): Promise<MonitoringPricingResponse> {
    const params: Record<string, unknown> = {};
    if (pollIntervalDays !== undefined) {
      params.poll_interval_days = this.validatePollInterval(pollIntervalDays);
    }
    return this.getJson('/account/monitoring/pricing', params);
  }

  async listMonitors(): Promise<MonitorsResponse> {
    return this.getJson('/account/monitors');
  }

  async createMonitor(params: CreateMonitorParams): Promise<MonitorResponse> {
    if (typeof params.entityId !== 'string' || !MONITOR_ENTITY_ID.test(params.entityId)) {
      throw new ValidationError(
        'entityId must be a 1-128 character organization id using [A-Za-z0-9._~-]',
      );
    }
    const endpointValues =
      typeof params.endpointIds === 'string'
        ? [params.endpointIds]
        : Array.from(params.endpointIds || []);
    const endpointIds = Array.from(new Set(endpointValues));
    if (endpointIds.length === 0) {
      throw new ValidationError('endpointIds must contain at least one id');
    }
    endpointIds.forEach((id) =>
      this.validatePublicId(
        id,
        WEBHOOK_ENDPOINT_ID,
        'endpointIds',
        'wep_01hzy2q6j3g5m8v9x0abcde123',
      ),
    );
    if (
      params.label !== undefined &&
      (typeof params.label !== 'string' || params.label.length > 200)
    ) {
      throw new ValidationError('label must be a string of at most 200 characters');
    }
    const body: Record<string, unknown> = {
      entity_id: params.entityId,
      poll_interval_days: this.validatePollInterval(params.pollIntervalDays),
      endpoint_ids: endpointIds,
    };
    if (params.label !== undefined) body.label = params.label;
    return this.mutate('POST', '/account/monitors', {
      body,
      idempotencyKey: params.idempotencyKey,
    });
  }

  async getMonitor(monitorId: string): Promise<MonitorResponse> {
    this.validatePublicId(
      monitorId,
      MONITOR_ID,
      'monitorId',
      'mon_01hzy2q6j3g5m8v9x0abcde123',
    );
    return this.getJson(`/account/monitors/${monitorId}`);
  }

  async updateMonitor(
    monitorId: string,
    pollIntervalDays: number,
    idempotencyKey?: string,
  ): Promise<MonitorResponse> {
    this.validatePublicId(
      monitorId,
      MONITOR_ID,
      'monitorId',
      'mon_01hzy2q6j3g5m8v9x0abcde123',
    );
    return this.mutate('PATCH', `/account/monitors/${monitorId}`, {
      body: { poll_interval_days: this.validatePollInterval(pollIntervalDays) },
      idempotencyKey,
    });
  }

  async pauseMonitor(
    monitorId: string,
    idempotencyKey?: string,
  ): Promise<MonitorResponse> {
    return this.monitorAction(monitorId, 'pause', idempotencyKey);
  }

  async resumeMonitor(
    monitorId: string,
    idempotencyKey?: string,
  ): Promise<MonitorResponse> {
    return this.monitorAction(monitorId, 'resume', idempotencyKey);
  }

  private async monitorAction(
    monitorId: string,
    action: 'pause' | 'resume',
    idempotencyKey?: string,
  ): Promise<MonitorResponse> {
    this.validatePublicId(
      monitorId,
      MONITOR_ID,
      'monitorId',
      'mon_01hzy2q6j3g5m8v9x0abcde123',
    );
    return this.mutate('POST', `/account/monitors/${monitorId}/${action}`, {
      idempotencyKey,
    });
  }

  async archiveMonitor(
    monitorId: string,
    idempotencyKey?: string,
  ): Promise<MonitorResponse> {
    this.validatePublicId(
      monitorId,
      MONITOR_ID,
      'monitorId',
      'mon_01hzy2q6j3g5m8v9x0abcde123',
    );
    return this.mutate('DELETE', `/account/monitors/${monitorId}`, {
      idempotencyKey,
    });
  }

  async listWebhookEndpoints(): Promise<WebhookEndpointsResponse> {
    return this.getJson('/account/webhook-endpoints');
  }

  async createWebhookEndpoint(
    params: CreateWebhookEndpointParams,
  ): Promise<WebhookEndpointResponse> {
    if (
      typeof params.name !== 'string' ||
      !params.name.trim() ||
      params.name.length > 120
    ) {
      throw new ValidationError('name must be a non-empty string of at most 120 characters');
    }
    if (typeof params.url !== 'string' || !params.url.trim()) {
      throw new ValidationError('url is required');
    }
    const body: Record<string, unknown> = { name: params.name, url: params.url };
    if (params.headers !== undefined) {
      if (
        !params.headers ||
        typeof params.headers !== 'object' ||
        Array.isArray(params.headers) ||
        Object.entries(params.headers).some(
          ([key, value]) => typeof key !== 'string' || typeof value !== 'string',
        )
      ) {
        throw new ValidationError('headers must map string names to string values');
      }
      body.headers = { ...params.headers };
    }
    return this.mutate('POST', '/account/webhook-endpoints', {
      body,
      idempotencyKey: params.idempotencyKey,
    });
  }

  async verifyWebhookEndpoint(
    endpointId: string,
    idempotencyKey?: string,
  ): Promise<WebhookEndpointResponse> {
    this.validateWebhookEndpointId(endpointId);
    return this.mutate('POST', `/account/webhook-endpoints/${endpointId}/verify`, {
      idempotencyKey,
      networkIo: true,
      verifiedResultOn422: true,
    });
  }

  async rotateWebhookEndpointSecret(
    endpointId: string,
    idempotencyKey?: string,
  ): Promise<WebhookEndpointResponse> {
    this.validateWebhookEndpointId(endpointId);
    return this.mutate(
      'POST',
      `/account/webhook-endpoints/${endpointId}/rotate-secret`,
      { idempotencyKey },
    );
  }

  async testWebhookEndpoint(
    endpointId: string,
    idempotencyKey?: string,
  ): Promise<WebhookDeliveryResponse> {
    this.validateWebhookEndpointId(endpointId);
    return this.mutate('POST', `/account/webhook-endpoints/${endpointId}/test`, {
      idempotencyKey,
      networkIo: true,
    });
  }

  async enableWebhookEndpoint(
    endpointId: string,
    idempotencyKey?: string,
  ): Promise<WebhookEndpointResponse> {
    return this.setWebhookEndpointState(endpointId, 'enable', idempotencyKey);
  }

  async disableWebhookEndpoint(
    endpointId: string,
    idempotencyKey?: string,
  ): Promise<WebhookEndpointResponse> {
    return this.setWebhookEndpointState(endpointId, 'disable', idempotencyKey);
  }

  private async setWebhookEndpointState(
    endpointId: string,
    state: 'enable' | 'disable',
    idempotencyKey?: string,
  ): Promise<WebhookEndpointResponse> {
    this.validateWebhookEndpointId(endpointId);
    return this.mutate('POST', `/account/webhook-endpoints/${endpointId}/${state}`, {
      idempotencyKey,
    });
  }

  async archiveWebhookEndpoint(
    endpointId: string,
    idempotencyKey?: string,
  ): Promise<WebhookEndpointResponse> {
    this.validateWebhookEndpointId(endpointId);
    return this.mutate('DELETE', `/account/webhook-endpoints/${endpointId}`, {
      idempotencyKey,
    });
  }

  async listWebhookDeliveries(
    endpointId?: string,
  ): Promise<WebhookDeliveriesResponse> {
    const params: Record<string, unknown> = {};
    if (endpointId !== undefined) {
      this.validateWebhookEndpointId(endpointId);
      params.endpoint = endpointId;
    }
    return this.getJson('/account/webhook-deliveries', params);
  }

  async retryWebhookDelivery(
    deliveryId: string,
    idempotencyKey?: string,
  ): Promise<WebhookDeliveryResponse> {
    this.validatePublicId(
      deliveryId,
      WEBHOOK_DELIVERY_ID,
      'deliveryId',
      'del_01hzy2q6j3g5m8v9x0abcde123',
    );
    return this.mutate(
      'POST',
      `/account/webhook-deliveries/${deliveryId}/retry`,
      { idempotencyKey },
    );
  }

  async listWebhookEvents(): Promise<WebhookEventsResponse> {
    return this.getJson('/account/webhook-events');
  }

  private validateWebhookEndpointId(endpointId: string): void {
    this.validatePublicId(
      endpointId,
      WEBHOOK_ENDPOINT_ID,
      'endpointId',
      'wep_01hzy2q6j3g5m8v9x0abcde123',
    );
  }

  // ------------------------------------------------------------------
  // Bearer token management
  // ------------------------------------------------------------------

  async createToken(params: CreateTokenParams): Promise<CreateTokenResponse> {
    if (!params.tokenName) {
      throw new ValidationError('tokenName is required');
    }
    const body: Record<string, unknown> = { token_name: params.tokenName };
    if (params.abilities !== undefined) body.abilities = params.abilities;
    if (params.expiresAt !== undefined) body.expires_at = params.expiresAt;

    const response = await this.requestWithRetry<CreateTokenResponse>(
      () => this.httpClient.post('/auth/tokens/create', body),
      false,
    );
    return response.data;
  }

  async listTokens(): Promise<ListTokensResponse> {
    const response = await this.requestWithRetry<ListTokensResponse>(() =>
      this.httpClient.get('/auth/tokens'),
    );
    return response.data;
  }

  async revokeToken(
    tokenId: string | number,
  ): Promise<TokenRevocationResponse> {
    if (tokenId === undefined || tokenId === null || tokenId === '') {
      throw new ValidationError('tokenId is required');
    }
    const response = await this.requestWithRetry<TokenRevocationResponse>(() =>
      this.httpClient.delete(
        `/auth/tokens/${encodeURIComponent(String(tokenId))}`,
      ),
    );
    return response.data ?? {};
  }

  async revokeAllTokens(): Promise<TokenRevocationResponse> {
    const response = await this.requestWithRetry<TokenRevocationResponse>(() =>
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
    let processedItems: FileRecord[] = [];
    let startIndex = 0;

    if (snapshotDir) {
      const snapshotFile = `snapshot_${path.basename(filePath, path.extname(filePath))}.json`;
      snapshotPath = path.join(snapshotDir, snapshotFile);

      if (fs.existsSync(snapshotPath)) {
        const snapshotData: unknown = JSON.parse(
          fs.readFileSync(snapshotPath, 'utf-8'),
        );
        if (snapshotData && typeof snapshotData === 'object') {
          const processed = (snapshotData as Record<string, unknown>).processed;
          if (
            Array.isArray(processed) &&
            processed.every(
              (item) =>
                !!item && typeof item === 'object' && !Array.isArray(item),
            )
          ) {
            processedItems = processed as FileRecord[];
          }
        }
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
          const value = item[itemProp];
          if (value !== undefined && value !== null && value !== '') {
            queryParts.push(serializeQueryValue(value));
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
