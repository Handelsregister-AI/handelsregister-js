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
export type SearchAiMode = 'on-default';

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
  | 'shareholdings'
  | 'mergers_and_acquisitions';

export interface SearchParams {
  q?: string;
  features?: Feature[];
  aiSearch?: AiSearchMode | boolean;
  realtimeMode?: RealtimeMode | boolean;
}

export type DocumentType =
  | 'shareholders_list'
  | 'articles_of_association'
  | 'AD'
  | 'CD'
  | 'SI';

export interface ApiMeta {
  message?: string;
  request_credit_cost?: number;
  credits_remaining?: number | string;
  required_plans?: string[];
  [key: string]: unknown;
}

export interface Money {
  amount: number;
  currency: string;
}

export interface Coordinates {
  latitude?: number;
  longitude?: number;
  /** @deprecated Legacy response alias retained for compatibility. */
  lat?: number;
  /** @deprecated Legacy response alias retained for compatibility. */
  lon?: number;
}

export interface Address {
  house_number?: string | number;
  street?: string;
  postal_code?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
  coordinates?: Coordinates;
  [key: string]: unknown;
}

export interface Registration {
  court?: string;
  register_type?: string;
  register_number?: string;
  register_number_extra?: string;
  register_date?: string;
  [key: string]: unknown;
}

export interface ContactData {
  website?: string;
  phone_number?: string;
  email?: string;
  [key: string]: unknown;
}

export interface LocalizedShortLongText {
  long?: string;
  short?: string;
  [key: string]: unknown;
}

export interface LocalizedRole {
  en?: LocalizedShortLongText | string;
  de?: LocalizedShortLongText | string;
  [key: string]: unknown;
}

export interface LocalizedText {
  en?: string;
  de?: string;
  [key: string]: unknown;
}

export interface NameParts {
  given?: string;
  family?: string;
  maiden?: string | null;
  canonical_name?: string;
  previous_names?: string[] | null;
  [key: string]: unknown;
}

export interface PersonLocation {
  home?: {
    city?: string;
    state?: string;
    country?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface RepresentationSchemeHistoryEntry {
  value: string[];
  effective_from?: string | null;
  effective_to?: string | null;
  [key: string]: unknown;
}

export interface RepresentationScheme {
  current?: string[];
  /**
   * Past related-person records can expose the most recent scheme under
   * `latest` instead of `current`.
   */
  latest?: string[];
  history?: Array<RepresentationSchemeHistoryEntry | string>;
  [key: string]: unknown;
}

export interface RelatedPerson {
  entity_id?: string;
  label?: string;
  name: string;
  role:
    | string
    | LocalizedRole
    | {
        designation?: string;
        [key: string]: unknown;
      };
  start_date?: string | null;
  end_date?: string | null;
  birth_date?: string | null;
  name_parts?: NameParts;
  titles?: string[];
  location?: PersonLocation;
  organization_representation_scheme?: RepresentationScheme;
  role_representation_scheme?: RepresentationScheme;
  [key: string]: unknown;
}

export interface FinancialKPI {
  year: number;
  revenue?: number | null;
  net_income?: number | null;
  active_total?: number | null;
  material_expenses?: number | null;
  personnel_expenses?: number | null;
  employees?: number | null;
  /** @deprecated Legacy response field. Prefer `net_income`. */
  profit?: number | null;
  balance_sheet_total?: number | null;
  equity?: number | null;
  liabilities?: number | null;
  [key: string]: unknown;
}

export interface FinancialAccountName {
  de?: string;
  en?: string;
  in_report?: string;
  [key: string]: unknown;
}

export interface FinancialAccountNode {
  name: FinancialAccountName | string;
  value?: number | null;
  children?: FinancialAccountNode[];
  [key: string]: unknown;
}

export interface BalanceSheetAccount {
  year: number;
  balance_sheet_accounts?: FinancialAccountNode[];
  /** @deprecated Legacy SDK shape retained for compatibility. */
  assets?: {
    fixed_assets?: number;
    current_assets?: number;
    total?: number;
    [key: string]: unknown;
  };
  /** @deprecated Legacy SDK shape retained for compatibility. */
  liabilities?: {
    equity?: number;
    provisions?: number;
    liabilities?: number;
    total?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ProfitLossAccount {
  year: number;
  profit_and_loss_accounts?: FinancialAccountNode[];
  /** @deprecated Legacy flattened fields retained for compatibility. */
  revenue?: number;
  other_operating_income?: number;
  cost_of_materials?: number;
  personnel_costs?: number;
  depreciation?: number;
  other_operating_expenses?: number;
  financial_result?: number;
  taxes?: number;
  net_income?: number;
  [key: string]: unknown;
}

export interface Publication {
  entity_type?: string;
  name?: LocalizedText | string;
  description?: {
    short?: LocalizedText | string;
    long?: LocalizedText | string;
    [key: string]: unknown;
  };
  start_date?: string;
  details?: {
    value?: unknown;
    linked_entities?: Record<string, unknown>;
    [key: string]: unknown;
  };
  /** @deprecated Legacy publication field. */
  date?: string;
  /** @deprecated Legacy publication field. */
  type?: string;
  /** @deprecated Legacy publication field. */
  content?: string;
  /** @deprecated Legacy publication field. */
  source?: string;
  [key: string]: unknown;
}

export interface AnnualFinancialStatement {
  document_type?: string;
  document_date?: string;
  document_title?: string;
  language?: string;
  year: number;
  document_md?: string;
  document_html?: string;
  [key: string]: unknown;
}

export interface Shareholder {
  entity_id?: string;
  entity_name?: string;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  address?: string | Address;
  country_code?: string;
  registration_reference?: string | Registration;
  [key: string]: unknown;
}

export interface ShareholderEntry {
  shareholder?: Shareholder;
  contribution?: Money;
  contribution_ratio?: number;
  role?: {
    label?: string;
    en?: LocalizedShortLongText | string;
    de?: LocalizedShortLongText | string;
    [key: string]: unknown;
  };
  /** @deprecated Legacy flattened fields retained for compatibility. */
  display_name?: string;
  /** @deprecated Legacy flattened fields retained for compatibility. */
  address?: string;
  /** @deprecated Legacy flattened fields retained for compatibility. */
  contribution_amount?: number;
  /** @deprecated Legacy flattened fields retained for compatibility. */
  contribution_currency?: string;
  /** @deprecated Legacy flattened fields retained for compatibility. */
  percentage?: number;
  [key: string]: unknown;
}

export interface ShareholderSnapshot {
  total_capital?: Money;
  shareholders?: ShareholderEntry[];
  [key: string]: unknown;
}

export interface ShareholderInfo {
  total_capital?: number | Money;
  entries?: ShareholderEntry[];
  history?: {
    current_as_of?: string;
    past?: Array<{
      as_of?: string;
      data?: ShareholderSnapshot;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  /** @deprecated Legacy escape hatch. The current response is fully typed. */
  raw?: unknown;
  [key: string]: unknown;
}

export interface UBOPerson {
  entity_id?: string;
  name?: string;
  birth_date?: string;
  name_parts?: NameParts;
  location?: PersonLocation;
  [key: string]: unknown;
}

export interface UBOPathStep {
  depth?: number;
  name?: string;
  entity_id?: string;
  step_percentage?: number;
  [key: string]: unknown;
}

export interface UBOPath {
  percentage?: number;
  via?: UBOPathStep[];
  [key: string]: unknown;
}

export interface UBOEntry {
  person?: UBOPerson;
  ownership_percentage?: number;
  paths?: UBOPath[];
  /** @deprecated Legacy flattened field. */
  name?: string;
  /** @deprecated Legacy flattened field. */
  percentage?: number;
  /** @deprecated Legacy flattened field. */
  type?: string;
  /** @deprecated Legacy flattened field. */
  resolved?: boolean;
  [key: string]: unknown;
}

export interface UnresolvedUBO {
  reason?: string;
  entity_id?: string;
  name?: string;
  legal_form?: string;
  address?: Address;
  registration?: Registration;
  ownership_percentage?: number;
  via?: UBOPathStep[];
  [key: string]: unknown;
}

export interface UBOInfo {
  beneficial_owners?: UBOEntry[];
  unresolved_beneficial_owners?: UnresolvedUBO[];
  coverage?: Record<string, unknown> | number | null;
  /** @deprecated Legacy alias. Prefer `beneficial_owners`. */
  resolved?: UBOEntry[];
  /** @deprecated Legacy alias. Prefer `unresolved_beneficial_owners`. */
  unresolved?: UBOEntry[];
  /** @deprecated Legacy escape hatch. The current response is fully typed. */
  raw?: unknown;
  [key: string]: unknown;
}

export interface OrganizationReference {
  entity_id?: string;
  name?: string;
  status?: string;
  legal_form?: string;
  address?: Address;
  registration?: Registration;
  [key: string]: unknown;
}

export interface ShareholdingEntry {
  organization?: OrganizationReference;
  ownership?: {
    percentage?: number;
    contribution?: Money;
    [key: string]: unknown;
  };
  as_of?: string;
  /** @deprecated Legacy flattened field. */
  organization_name?: string;
  /** @deprecated Legacy flattened field. */
  percentage?: number;
  /** @deprecated Legacy flattened field. */
  contribution_amount?: number;
  /** @deprecated Legacy flattened field. */
  contribution_currency?: string;
  [key: string]: unknown;
}

export interface ShareholdingsInfo {
  holdings?: {
    current?: ShareholdingEntry[];
    past?: ShareholdingEntry[];
    [key: string]: unknown;
  };
  summary?: {
    total_current?: number;
    [key: string]: unknown;
  };
  /** @deprecated Legacy alias. Prefer `holdings.current`. */
  current?: ShareholdingEntry[];
  /** @deprecated Legacy alias. Prefer `holdings.past`. */
  past?: ShareholdingEntry[];
  /** @deprecated Legacy escape hatch. The current response is fully typed. */
  raw?: unknown;
  [key: string]: unknown;
}

export interface NewsItem {
  id?: string;
  title?: string;
  source?: string;
  publication_date?: string;
  url?: string;
  /** @deprecated Legacy alias. Prefer `publication_date`. */
  date?: string;
  summary?: string;
  [key: string]: unknown;
}

export interface InsolvencyPublication {
  publication_date?: string;
  insolvency_id?: string;
  court_city?: string;
  entity_name?: string;
  seat?: string;
  register?: string;
  publication_label?: string;
  event_notice?: string;
  /** @deprecated Legacy aliases retained for compatibility. */
  date?: string;
  court?: string;
  case_number?: string;
  content?: string;
  [key: string]: unknown;
}

export interface WebsiteContentObject {
  url?: string;
  content?: string;
  [key: string]: unknown;
}

/** Website content is currently returned as LLM-ready Markdown. */
export type WebsiteContent = string | WebsiteContentObject | WebsiteContentObject[];

export interface MergerAcquisitionCounterparty {
  entity_id?: string;
  name?: string;
  seat?: string;
  legal_form?: string;
  registration?: Registration;
  is_public_body?: boolean;
  role?: LocalizedRole & { label?: string };
  role_description?: string;
  [key: string]: unknown;
}

export interface MergerAcquisitionTransaction {
  id?: string;
  headline?: LocalizedText;
  type?: {
    category?: string;
    event_type?: string;
    name?: LocalizedText;
    [key: string]: unknown;
  };
  kind?: {
    label?: string;
    name?: LocalizedText;
    [key: string]: unknown;
  } | null;
  role?: LocalizedRole & { label?: string };
  phase?: string;
  is_registration_notice?: boolean;
  date?: string;
  date_basis?: string;
  dates?: {
    registered_at?: string | null;
    agreement_date?: string | null;
    resolution_date?: string | null;
    [key: string]: unknown;
  };
  counterparties?: MergerAcquisitionCounterparty[];
  description?: string;
  legal_basis?: unknown;
  terms?: unknown;
  register_entries?: Array<{
    registered_at?: string;
    description?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface MergerAcquisitionControlRelationship {
  counterparty?: MergerAcquisitionCounterparty;
  via?: {
    label?: string;
    name?: LocalizedText;
    [key: string]: unknown;
  };
  loss_absorption_obligation?: boolean;
  since?: string;
  until?: string | null;
  transaction_ids?: string[];
  [key: string]: unknown;
}

export interface MergersAndAcquisitionsInfo {
  transactions?: MergerAcquisitionTransaction[];
  succession?: unknown;
  control?: {
    controlled_by?: MergerAcquisitionControlRelationship[];
    controls?: MergerAcquisitionControlRelationship[];
    former?: MergerAcquisitionControlRelationship[];
    [key: string]: unknown;
  };
  summary?: {
    total_transactions?: number;
    by_category?: Record<
      string,
      {
        count?: number;
        name?: LocalizedText;
        [key: string]: unknown;
      }
    >;
    first_date?: string;
    last_date?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface CompanyData {
  entity_id: string;
  name: string;
  status?: string;
  legal_form?: string;
  purpose?: string;
  registration_date?: string;
  address?: Address;
  registration?: Registration;
  contact_data?: ContactData;
  keywords?: string[];
  products_and_services?: string;
  industry_classification?: string | Record<string, unknown>;
  representation_scheme?: RepresentationScheme;

  related_persons?: {
    current?: RelatedPerson[];
    past?: RelatedPerson[];
  };
  financial_kpi?: FinancialKPI[];
  balance_sheet_accounts?: BalanceSheetAccount[];
  profit_and_loss_account?: ProfitLossAccount[];
  history?: Publication[];
  /** @deprecated The `publications` feature is returned under `history`. */
  publications?: Publication[];
  annual_financial_statements?: AnnualFinancialStatement[];
  annual_financial_statements__html?: AnnualFinancialStatement[];
  /** @deprecated Legacy SDK alias retained for compatibility. */
  annual_financial_statements_html?: AnnualFinancialStatement[];
  shareholders?: ShareholderInfo;
  ubos?: UBOInfo;
  shareholdings?: ShareholdingsInfo;
  mergers_and_acquisitions?: MergersAndAcquisitionsInfo;
  news?: NewsItem[];
  insolvency_publications?: InsolvencyPublication[];
  website_content?: WebsiteContent;
  meta?: ApiMeta;

  /** @deprecated Legacy top-level registration fields. */
  court?: string;
  register_type?: string;
  register_number?: string;
  register_date?: string;
  /** @deprecated Legacy top-level contact fields. */
  website?: string;
  phone_number?: string;
  email?: string;
  /** @deprecated Legacy address/categorization fields. */
  wz2008_codes?: string[];
  [key: string]: unknown;
}

export interface FetchOrganizationResponse {
  data?: CompanyData;
  error?: string;
  status: number;
}

export interface RangeFilter {
  gte?: number;
  lte?: number;
}

export type StringOrStrings = string | string[];
export type CompanySizeCategory = 'micro' | 'small' | 'medium' | 'large';

export interface SearchOrganizationFilters {
  registration_date_from?: string;
  registration_date_to?: string;
  legal_form_code?: StringOrStrings;
  industry_code?: StringOrStrings;
  industry_scheme?: string;
  active?: boolean;
  postal_code?: string;
  city?: string;
  state?: string;
  location_coordinates?: Coordinates | [number, number];
  location_max_distance_km?: number;
  registration_type?: StringOrStrings;
  registration_authority_name?: string;
  registration_number?: string;
  company_size_category?: CompanySizeCategory;
  emp_count?: RangeFilter;
  bs_assets_total?: RangeFilter;
  bs_equity_total?: RangeFilter;
  bs_liabilities_total?: RangeFilter;
  bs_cash_and_equivalents?: RangeFilter;
  bs_cash_to_liabilities?: RangeFilter;
  bs_equity_ratio?: RangeFilter;
  bs_debt_to_assets?: RangeFilter;
  pl_revenue?: RangeFilter;
  pl_net_income?: RangeFilter;
  pl_ebit?: RangeFilter;
  [key: string]: unknown;
}

export interface SearchOrganizationsParams {
  /** Required unless `filters` is provided. */
  q?: string;
  skip?: number;
  /** Defaults to 10; maximum 30. */
  limit?: number;
  filters?: SearchOrganizationFilters;
  aiMode?: SearchAiMode | boolean;
}

export interface SearchResultItem {
  entity_id: string;
  name: string;
  registration?: Registration;
  address?: Address;
  registration_date?: string;
  purpose?: string;
  status?: string;
  legal_form?: string;
  [key: string]: unknown;
}

export interface SearchOrganizationsResponse {
  results: SearchResultItem[];
  total: number;
  meta?: ApiMeta;
  [key: string]: unknown;
}

export type PersonFeature = 'shareholdings';

export interface FetchPersonParams {
  personQ: string;
  organizationQ: string;
  features?: PersonFeature[];
}

export interface PersonContactEntry {
  address?: string;
  number?: string;
  value?: string;
  type?: string;
  label?: string;
  [key: string]: unknown;
}

export interface PersonRegistryRole {
  entity_id?: string;
  name?: string;
  organization?: string;
  label?: string;
  role?: LocalizedRole | LocalizedText | string;
  start_date?: string | null;
  end_date?: string | null;
  /** @deprecated Legacy convenience flag. Current responses use `end_date`. */
  is_current?: boolean;
  [key: string]: unknown;
}

export type PersonShareholdings = ShareholdingsInfo;

export interface PersonData {
  entity_id: string;
  name: string;
  birth_date?: string;
  name_parts?: NameParts;
  location?: PersonLocation;
  bio?: string;
  expertise?: string[];
  contact?: {
    emails?: Array<string | PersonContactEntry>;
    phones?: Array<string | PersonContactEntry>;
    [key: string]: unknown;
  };
  profiles?: {
    linkedin?: string;
    github?: string;
    other?: unknown[];
    [key: string]: unknown;
  };
  handelsregister_roles?: PersonRegistryRole[];
  affiliations?: Array<{
    organization?: string;
    relation?: string;
    [key: string]: unknown;
  }>;
  shareholdings?: PersonShareholdings;
  meta?: ApiMeta;
  [key: string]: unknown;
}

export interface FetchDocumentParams {
  companyId: string;
  documentType: DocumentType;
  outputFile?: string;
}

export interface FetchedDocument {
  data: Buffer;
  documentType: DocumentType;
  contentType?: string;
  fileName?: string;
}

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
  last_used_at?: string | null;
  [key: string]: unknown;
}

export interface CreateTokenResponse {
  token?: string;
  [key: string]: unknown;
}

export interface ListTokensResponse {
  tokens?: TokenInfo[];
  [key: string]: unknown;
}

export interface TokenRevocationResponse {
  message?: string;
  [key: string]: unknown;
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
