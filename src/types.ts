export interface HandelsregisterConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  cacheEnabled?: boolean;
  rateLimit?: number;
}

export interface SearchParams {
  q?: string;
  features?: Feature[];
  aiSearch?: 'on' | 'off';
}

export type Feature = 
  | 'related_persons'
  | 'publications'
  | 'financial_kpi'
  | 'balance_sheet_accounts'
  | 'profit_and_loss_account'
  | 'annual_financial_statements';

export type DocumentType = 'shareholders_list' | 'AD' | 'CD';

export interface Address {
  street?: string;
  postal_code?: string;
  city?: string;
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