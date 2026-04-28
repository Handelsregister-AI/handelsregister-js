export interface HandelsregisterConfig {
  apiKey?: string;
  bearerToken?: string;
  baseUrl?: string;
  timeout?: number;
  cacheEnabled?: boolean;
  rateLimit?: number;
}

export type AiSearchMode = 'on-default' | 'off';
export type RealtimeMode = 'handelsregister-default';

export interface SearchParams {
  q?: string;
  features?: Feature[];
  aiSearch?: AiSearchMode | boolean;
  realtimeMode?: RealtimeMode | boolean;
}

export type Feature =
  | 'related_persons'
  | 'publications'
  | 'financial_kpi'
  | 'balance_sheet_accounts'
  | 'profit_and_loss_account'
  | 'annual_financial_statements'
  | 'annual_financial_statements__html'
  | 'insolvency_publications'
  | 'news'
  | 'website_content'
  | 'shareholders'
  | 'ubos'
  | 'shareholdings';

export type DocumentType =
  | 'shareholders_list'
  | 'articles_of_association'
  | 'AD'
  | 'CD';

export interface Address {
  street?: string;
  house_number?: string | number;
  postal_code?: string;
  city?: string;
  country?: string;
  country_code?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export interface RelatedPerson {
  name: string;
  role: string | { designation?: string; [key: string]: any };
}

export interface FinancialKPI {
  year: number;
  revenue?: number;
  profit?: number;
  employees?: number;
  balance_sheet_total?: number;
  equity?: number;
  liabilities?: number;
}

export interface BalanceSheetAccount {
  year: number;
  assets?: {
    fixed_assets?: number;
    current_assets?: number;
    total?: number;
  };
  liabilities?: {
    equity?: number;
    provisions?: number;
    liabilities?: number;
    total?: number;
  };
}

export interface ProfitLossAccount {
  year: number;
  revenue?: number;
  other_operating_income?: number;
  cost_of_materials?: number;
  personnel_costs?: number;
  depreciation?: number;
  other_operating_expenses?: number;
  financial_result?: number;
  taxes?: number;
  net_income?: number;
}

export interface Publication {
  date: string;
  type: string;
  content: string;
  source?: string;
}

export interface ShareholderEntry {
  display_name?: string;
  address?: string;
  contribution_amount?: number;
  contribution_currency?: string;
  percentage?: number;
  [key: string]: any;
}

export interface ShareholderInfo {
  entries?: ShareholderEntry[];
  // The API may return either a plain number or a structured object (e.g. { amount, currency }).
  total_capital?: number | { [key: string]: any };
  raw?: any;
}

export interface UBOEntry {
  name?: string;
  percentage?: number;
  type?: string;
  resolved?: boolean;
  [key: string]: any;
}

export interface UBOInfo {
  resolved?: UBOEntry[];
  unresolved?: UBOEntry[];
  coverage?: any;
  raw?: any;
}

export interface ShareholdingEntry {
  organization_name?: string;
  percentage?: number;
  contribution_amount?: number;
  contribution_currency?: string;
  as_of?: string;
  [key: string]: any;
}

export interface ShareholdingsInfo {
  current?: ShareholdingEntry[];
  past?: ShareholdingEntry[];
  summary?: any;
  raw?: any;
}

export interface NewsItem {
  title?: string;
  url?: string;
  date?: string;
  source?: string;
  summary?: string;
  [key: string]: any;
}

export interface InsolvencyPublication {
  date?: string;
  court?: string;
  case_number?: string;
  content?: string;
  [key: string]: any;
}

export interface WebsiteContent {
  url?: string;
  content?: string;
  [key: string]: any;
}

export interface CompanyData {
  // Basic information
  entity_id: string;
  name: string;
  status?: string;
  purpose?: string;

  // Registration (can be in top level or nested)
  court?: string;
  register_type?: string;
  register_number?: string;
  register_date?: string;

  // Registration object (newer API format)
  registration?: {
    court?: string;
    register_type?: string;
    register_number?: string;
    register_date?: string;
  };
  registration_date?: string;

  // Legal form
  legal_form?: string;

  // Address and contact
  address?: Address;
  website?: string;
  phone_number?: string;
  email?: string;

  // Business information
  keywords?: string[];
  products_and_services?: string;
  industry_classification?: string;
  wz2008_codes?: string[];

  // Related persons
  related_persons?: {
    current?: RelatedPerson[];
    past?: RelatedPerson[];
  };

  // Financial data
  financial_kpi?: FinancialKPI[];
  balance_sheet_accounts?: BalanceSheetAccount[];
  profit_and_loss_account?: ProfitLossAccount[];

  // History and publications
  history?: Array<{
    date: string;
    event: string;
    type?: string;
    details?: string;
  }>;
  publications?: Publication[];

  // Annual financial statements
  annual_financial_statements?: Array<{
    year: number;
    [key: string]: any;
  }>;
  annual_financial_statements_html?: Array<{
    year: number;
    [key: string]: any;
  }>;

  // Ownership
  shareholders?: ShareholderInfo;
  ubos?: UBOInfo;
  shareholdings?: ShareholdingsInfo;

  // Other enrichments
  news?: NewsItem[];
  insolvency_publications?: InsolvencyPublication[];
  website_content?: WebsiteContent | WebsiteContent[];

  // Meta information
  meta?: {
    request_credit_cost?: number;
    credits_remaining?: number;
  };
}

export interface FetchOrganizationResponse {
  data?: CompanyData;
  error?: string;
  status: number;
}

// search-organizations endpoint

export interface SearchOrganizationsParams {
  q: string;
  skip?: number;
  limit?: number;
  filters?: { postal_code?: string; [key: string]: any };
}

export interface SearchResultItem {
  entity_id: string;
  name: string;
  registration?: {
    court?: string;
    register_type?: string;
    register_number?: string;
  };
  address?: Address;
  [key: string]: any;
}

export interface SearchOrganizationsResponse {
  results: SearchResultItem[];
  total: number;
  meta?: {
    request_credit_cost?: number;
    credits_remaining?: number;
  };
  [key: string]: any;
}

// fetch-person endpoint

export type PersonFeature = 'shareholdings';

export interface FetchPersonParams {
  personQ: string;
  organizationQ: string;
  features?: PersonFeature[];
}

export interface PersonShareholdings {
  current?: Array<{ organization_name?: string; percentage?: number; [key: string]: any }>;
  past?: Array<{ [key: string]: any }>;
  summary?: { total_current?: number; [key: string]: any };
  raw?: any;
}

export interface PersonData {
  entity_id: string;
  name: string;
  birth_date?: string;
  name_parts?: {
    given?: string;
    family?: string;
    canonical_name?: string;
    previous_names?: string[];
  };
  location?: {
    home?: { city?: string; [key: string]: any };
    [key: string]: any;
  };
  bio?: string;
  expertise?: string[];
  contact?: {
    emails?: string[];
    phones?: string[];
  };
  profiles?: {
    linkedin?: string;
    github?: string;
    [key: string]: any;
  };
  handelsregister_roles?: Array<{
    label?: string;
    organization?: string;
    is_current?: boolean;
    [key: string]: any;
  }>;
  affiliations?: Array<{ [key: string]: any }>;
  shareholdings?: PersonShareholdings;
  meta?: {
    request_credit_cost?: number;
    credits_remaining?: number;
  };
  [key: string]: any;
}

// Token management

export interface CreateTokenParams {
  tokenName: string;
  abilities?: string[];
  expiresAt?: string;
}

export interface TokenInfo {
  id: string | number;
  name?: string;
  abilities?: string[];
  expires_at?: string | null;
  created_at?: string;
  [key: string]: any;
}

export interface CreateTokenResponse {
  token?: string;
  [key: string]: any;
}

export interface ListTokensResponse {
  tokens?: TokenInfo[];
  [key: string]: any;
}

// Enrichment

export interface EnrichmentOptions {
  filePath: string;
  inputType: 'json' | 'csv' | 'xlsx';
  queryProperties: Record<string, string>;
  snapshotDir?: string;
  snapshotInterval?: number;
  params?: SearchParams;
}

export interface EnrichmentResult {
  processedCount: number;
  errorCount: number;
  outputPath: string;
  errors?: Array<{
    row: number;
    error: string;
  }>;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
