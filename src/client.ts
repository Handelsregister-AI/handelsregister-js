import axios, { AxiosInstance, AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as cliProgress from 'cli-progress';
import { 
  HandelsregisterConfig, 
  SearchParams, 
  CompanyData,
  DocumentType,
  EnrichmentOptions,
  EnrichmentResult
} from './types';
import { 
  HandelsregisterError, 
  AuthenticationError, 
  InvalidResponseError,
  NetworkError,
  RateLimitError,
  ValidationError
} from './errors';
import { Cache, generateCacheKey } from './utils/cache';
import { retry, sleep } from './utils/retry';
import { readFile, writeFile } from './utils/fileHandler';

const DEFAULT_BASE_URL = 'https://handelsregister.ai/api/v1/';
const DEFAULT_TIMEOUT = 90000; // 90 seconds
const USER_AGENT = 'handelsregister-js/1.0.0';

export class Handelsregister {
  private apiKey: string;
  private httpClient: AxiosInstance;
  private cache?: Cache<CompanyData>;
  private rateLimit?: number;

  constructor(config: HandelsregisterConfig | string) {
    if (typeof config === 'string') {
      this.apiKey = config;
      config = { apiKey: config };
    } else {
      this.apiKey = config.apiKey;
    }

    if (!this.apiKey) {
      const envApiKey = process.env.HANDELSREGISTER_API_KEY;
      if (envApiKey) {
        this.apiKey = envApiKey;
      } else {
        throw new AuthenticationError('API key is required. Pass it to the constructor or set HANDELSREGISTER_API_KEY environment variable.');
      }
    }

    const baseURL = config.baseUrl || DEFAULT_BASE_URL;
    const timeout = config.timeout || DEFAULT_TIMEOUT;

    this.httpClient = axios.create({
      baseURL,
      timeout,
      headers: {
        'User-Agent': USER_AGENT
      }
    });

    if (config.cacheEnabled !== false) {
      this.cache = new Cache<CompanyData>();
    }

    this.rateLimit = config.rateLimit;
  }

  async fetchOrganization(params: SearchParams | string): Promise<CompanyData> {
    const searchParams: SearchParams = typeof params === 'string' 
      ? { q: params } 
      : params;

    const query = searchParams.q || '';
    if (!query || query.trim() === '') {
      throw new ValidationError('Search query (q) is required');
    }

    const cacheKey = this.cache ? generateCacheKey({ ...searchParams, api_key: this.apiKey }) : null;
    
    if (cacheKey && this.cache?.has(cacheKey)) {
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) return cachedData;
    }

    const queryParams: any = {
      api_key: this.apiKey,
      q: query
    };

    if (searchParams.features && searchParams.features.length > 0) {
      queryParams['feature'] = searchParams.features;
    }

    if (searchParams.aiSearch !== undefined) {
      queryParams.ai_search = searchParams.aiSearch;
    }

    try {
      const response = await retry(
        async () => {
          if (this.rateLimit && this.rateLimit > 0) {
            await sleep(this.rateLimit * 1000);
          }

          return await this.httpClient.get('/fetch-organization', {
            params: queryParams,
            paramsSerializer: (params) => {
              const parts: string[] = [];
              for (const key in params) {
                const value = params[key];
                if (Array.isArray(value)) {
                  // For feature array, send multiple feature parameters
                  value.forEach(v => parts.push(`feature=${encodeURIComponent(v)}`));
                } else if (key !== 'feature') {
                  parts.push(`${key}=${encodeURIComponent(value)}`);
                }
              }
              return parts.join('&');
            }
          });
        },
        {
          shouldRetry: (error: any) => {
            if (error.response?.status === 401) return false;
            if (error.response?.status === 429) return true;
            if (error.response?.status >= 500) return true;
            if (!error.response) return true; // Network errors
            return false;
          }
        }
      );

      if (response.status === 401) {
        throw new AuthenticationError();
      }

      if (!response.data || typeof response.data !== 'object') {
        throw new InvalidResponseError('Invalid response format from API', response.data);
      }

      const companyData = response.data as CompanyData;

      if (cacheKey && this.cache) {
        this.cache.set(cacheKey, companyData);
      }

      return companyData;
    } catch (error) {
      if (error instanceof HandelsregisterError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        
        if (axiosError.response) {
          const status = axiosError.response.status;
          const data = axiosError.response.data;
          
          if (status === 401) {
            throw new AuthenticationError();
          } else if (status === 429) {
            throw new RateLimitError();
          } else {
            throw new HandelsregisterError(
              `API request failed with status ${status}`,
              status,
              data
            );
          }
        } else if (axiosError.request) {
          throw new NetworkError('Network error: No response received from server');
        }
      }

      throw new HandelsregisterError('An unexpected error occurred', undefined, error);
    }
  }

  async fetchDocument(
    companyId: string,
    documentType: DocumentType,
    outputFile?: string
  ): Promise<Buffer> {
    if (!companyId || companyId.trim() === '') {
      throw new ValidationError('Company ID is required');
    }

    const validDocumentTypes: DocumentType[] = ['shareholders_list', 'AD', 'CD'];
    if (!validDocumentTypes.includes(documentType)) {
      throw new ValidationError(`Invalid document type. Must be one of: ${validDocumentTypes.join(', ')}`);
    }

    try {
      const response = await retry(
        async () => {
          if (this.rateLimit && this.rateLimit > 0) {
            await sleep(this.rateLimit * 1000);
          }

          return await this.httpClient.get('/fetch-document', {
            params: {
              api_key: this.apiKey,
              company_id: companyId,
              document_type: documentType
            },
            responseType: 'arraybuffer'
          });
        }
      );

      if (response.status === 401) {
        throw new AuthenticationError();
      }

      const buffer = Buffer.from(response.data);

      if (outputFile) {
        const absolutePath = path.resolve(outputFile);
        const dir = path.dirname(absolutePath);
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(absolutePath, buffer);
      }

      return buffer;
    } catch (error) {
      if (error instanceof HandelsregisterError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        
        if (axiosError.response) {
          const status = axiosError.response.status;
          
          if (status === 401) {
            throw new AuthenticationError();
          } else if (status === 404) {
            throw new HandelsregisterError('Document not found', 404);
          } else {
            throw new HandelsregisterError(
              `Failed to fetch document with status ${status}`,
              status
            );
          }
        }
      }

      throw new HandelsregisterError('Failed to fetch document', undefined, error);
    }
  }

  async enrich(options: EnrichmentOptions): Promise<EnrichmentResult> {
    const { filePath, inputType, queryProperties, snapshotDir, snapshotInterval = 10, params = {} } = options;
    
    // Read input file
    const fileData = await readFile(filePath, inputType);
    const items = fileData.data;
    
    if (items.length === 0) {
      return {
        processedCount: 0,
        errorCount: 0,
        outputPath: filePath
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
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
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
          ...params
        };

        const companyData = await this.fetchOrganization(searchParams);
        
        // Merge company data with original item
        const enrichedItem = {
          ...item,
          handelsregister_data: companyData
        };

        processedItems.push(enrichedItem);

        // Save snapshot at intervals
        if (snapshotPath && (i + 1) % snapshotInterval === 0) {
          fs.writeFileSync(snapshotPath, JSON.stringify({
            processed: processedItems,
            lastIndex: i
          }, null, 2));
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
      `_enriched.${inputType}`
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
      errors: errors.length > 0 ? errors : undefined
    };
  }
}