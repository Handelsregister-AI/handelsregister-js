import type {
  InsolvencyStatus,
  LegalFormLiabilityType,
  MonitorStatus,
  OrganizationFeature,
  OrganizationStatus,
  OwnershipStructure,
  SearchSort,
  SignalTopic,
  SortOrder,
  WebhookDeliveryStatus,
  WebhookEndpointStatus,
  WebhookEventType,
} from './constants.js';

export interface HandelsregisterConfig {
  apiKey?: string;
  bearerToken?: string;
  baseUrl?: string;
  timeout?: number;
  cacheEnabled?: boolean;
  rateLimit?: number;
  /** Additional headers for gateways or proxies. Authentication headers are reserved. */
  extraHeaders?: Record<string, string>;
}

export type AiSearchMode = 'on-default' | 'off';
export type RealtimeMode = 'handelsregister-default';
export type SearchAiMode = 'on-default';

/** Backward-compatible alias for the organization feature taxonomy. */
export type Feature = OrganizationFeature;

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
  blocked_filters?: string[];
  blocked_features?: string[];
  [key: string]: unknown;
}

export interface Money {
  amount: number;
  currency: string;
}

/** Registered capital is included in the base organization response. */
export interface CapitalValue {
  amount?: number | null;
  currency?: string | null;
  /** Open set, including STAMMKAPITAL, GRUNDKAPITAL and HAFTSUMME. */
  kind?: string | null;
  /** Unsigned amount of a capital change, not a signed delta. */
  change_amount?: Money | null;
  [key: string]: unknown;
}

export interface CapitalHistoryEntry {
  value?: CapitalValue | null;
  effective_from?: string | null;
  effective_to?: string | null;
  [key: string]: unknown;
}

export interface CapitalInfo {
  current?: CapitalValue | null;
  history?: CapitalHistoryEntry[];
  [key: string]: unknown;
}

/** Source metadata available on every plan; absent on older API versions. */
export interface FinancialProvenance {
  statement_type?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  exempt_subsidiary?: boolean | null;
  parent_organization?: OrganizationReference | null;
  [key: string]: unknown;
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

/** Pro/Max numeric metrics; absent on other plans or when unavailable. */
export type ExtendedFinancialMetric =
  | 'revenue_per_employee' | 'net_income_per_employee' | 'other_operating_income'
  | 'material_expenses_goods' | 'material_expenses_services' | 'wages_salaries'
  | 'social_expenses' | 'pension_costs' | 'depreciation_amortization'
  | 'depreciation_amortization_operating' | 'write_downs_financial_assets_and_securities' | 'other_operating_expenses'
  | 'selling_expenses' | 'admin_expenses' | 'opex_core'
  | 'gross_profit' | 'income_taxes' | 'other_taxes'
  | 'income_after_taxes' | 'interest_income' | 'interest_expense'
  | 'finance_income' | 'finance_income_from_affiliates' | 'assets_total'
  | 'fixed_assets_total' | 'current_assets_total' | 'inventory_total'
  | 'receivables_total' | 'trade_receivables' | 'intragroup_receivables'
  | 'securities_current_total' | 'cash_and_equivalents' | 'ppe_total'
  | 'land_and_buildings' | 'intangible_assets' | 'long_term_financial_assets'
  | 'prepaid_expenses' | 'equity_total' | 'capital_reserves'
  | 'revenue_reserves' | 'profit_loss_carried_forward' | 'tangible_equity'
  | 'liabilities_total' | 'provisions_total' | 'pension_provisions'
  | 'other_provisions' | 'trade_payables' | 'intragroup_payables'
  | 'liabilities_to_affiliated_companies' | 'other_liabilities' | 'deferred_income'
  | 'bank_debt' | 'operating_working_capital' | 'net_working_capital_strict'
  | 'net_working_capital_approx' | 'interest_bearing_debt_strict' | 'interest_bearing_debt_broad'
  | 'net_debt_narrow' | 'net_debt_broad' | 'equity_ratio'
  | 'tangible_equity_ratio' | 'debt_to_equity' | 'debt_to_assets'
  | 'cash_to_assets' | 'cash_to_liabilities' | 'receivables_to_assets'
  | 'inventory_to_assets' | 'ppe_to_assets' | 'intangible_to_assets'
  | 'goodwill_to_assets' | 'intangible_to_equity' | 'gross_margin'
  | 'ebitda_margin' | 'ebit_margin' | 'net_margin'
  | 'material_intensity' | 'personnel_intensity' | 'sga_ratio'
  | 'opex_ratio' | 'interest_coverage' | 'effective_tax_rate'
  | 'capitalized_own_work_ratio' | 'inventory_change_ratio' | 'finance_to_ebt_ratio';

export type ExtendedFinancialKPI = Partial<Record<ExtendedFinancialMetric, number | null>>;

export interface FinancialKPI extends ExtendedFinancialKPI {
  company_size_by_employees?: string | null;
  company_size_by_assets?: string | null;
  company_size_by_revenue?: string | null;
  source_statement_date?: string | null;
  source_statement_type?: string | null;
  year: number;
  _provenance?: FinancialProvenance | null;
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
  children?: FinancialAccountNode[] | null;
  [key: string]: unknown;
}

/** Current account trees and the older dictionary account layout. */
export type FinancialAccounts =
  | FinancialAccountNode[]
  | Record<string, unknown>
  | null;

export interface ActivityStatement {
  activity?: {
    name?: FinancialAccountName | string | null;
    [key: string]: unknown;
  };
  _provenance?: FinancialProvenance | null;
  [key: string]: unknown;
}

/** Max-only § 6b EnWG balance sheet for one regulated activity. */
export interface ActivityBalanceSheet extends ActivityStatement {
  balance_sheet_accounts?: FinancialAccounts;
}

/** Max-only § 6b EnWG P&L for one regulated activity. */
export interface ActivityProfitLossAccount extends ActivityStatement {
  profit_and_loss_accounts?: FinancialAccounts;
}

export interface BalanceSheetAccount {
  year: number;
  balance_sheet_accounts?: FinancialAccounts;
  _provenance?: FinancialProvenance | null;
  activity_statements?: ActivityBalanceSheet[] | null;
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
  profit_and_loss_accounts?: FinancialAccounts;
  _provenance?: FinancialProvenance | null;
  activity_statements?: ActivityProfitLossAccount[] | null;
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

/** Deep nominal amounts use `value`, unlike regular contributions' `amount`. */
export interface ShareholderAmount {
  value?: number | null;
  currency?: string | null;
  basis?: string | null;
  [key: string]: unknown;
}

export interface ShareholderRecord {
  date?: string | null;
  /** SHAREHOLDER_LIST, FOUNDING_DOCUMENT, COMMERCIAL_REGISTER, or future values. */
  source?: string | null;
  [key: string]: unknown;
}

export interface ShareholderHolder {
  entity_id?: string | null;
  /** PERSON, ORGANIZATION, JOINT, or future values. */
  type?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  legal_form?: string | null;
  status?: string | null;
  registration?: Registration | null;
  registration_text?: string | null;
  birth_date?: string | null;
  /** JOINT co-owners: do not allocate the community's percentage to members. */
  members?: ShareholderHolder[];
  [key: string]: unknown;
}

export interface ShareRange {
  from?: number | null;
  to?: number | null;
  count?: number | null;
  nominal_value?: ShareholderAmount | null;
  [key: string]: unknown;
}

export interface ShareholderOwnership {
  /** 0–100, unlike regular shareholders' 0–1 contribution_ratio. */
  percentage?: number | null;
  percentage_basis?: string | null;
  nominal_amount?: ShareholderAmount | null;
  share_count?: number | null;
  share_ranges?: ShareRange[];
  [key: string]: unknown;
}

/** One printed document row; the same holder may occur multiple times. */
export interface DeepShareholderEntry {
  holder?: ShareholderHolder;
  role?: string | null;
  ownership?: ShareholderOwnership;
  since?: string | null;
  since_basis?: string | null;
  until?: string | null;
  [key: string]: unknown;
}

export interface DeepShareholderHistorySnapshot {
  record?: ShareholderRecord;
  share_capital?: ShareholderAmount | null;
  entries?: DeepShareholderEntry[];
  [key: string]: unknown;
}

export interface ShareholderChange {
  holder?: ShareholderHolder;
  percentage?: number | null;
  percentage_before?: number | null;
  percentage_after?: number | null;
  [key: string]: unknown;
}

export interface ShareholderChanges {
  compared_to?: string | null;
  joined?: ShareholderChange[];
  left?: ShareholderChange[];
  changed?: ShareholderChange[];
  [key: string]: unknown;
}

/** Max-only deep shareholders, separate from the regular shareholder feature. */
export interface ShareholdersDeep extends DeepShareholderHistorySnapshot {
  history?: DeepShareholderHistorySnapshot[];
  changes?: ShareholderChanges | null;
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

export interface NetworkNodeReference {
  node_id?: string;
  type?: string;
  name?: string;
  [key: string]: unknown;
}

export interface NetworkNode extends NetworkNodeReference {
  entity_id?: string;
  depth?: number;
  is_root?: boolean;
}

export interface NetworkConnection {
  source?: NetworkNodeReference;
  target?: NetworkNodeReference;
  connection_type?: string;
  label?: string;
  role?: LocalizedText | LocalizedRole | Record<string, unknown>;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  depth?: number;
  [key: string]: unknown;
}

export interface OrganizationNetwork {
  depth?: number;
  nodes?: NetworkNode[];
  connections?: NetworkConnection[];
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
  capital?: CapitalInfo | null;

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
  /** Omitted on non-Max; null when no current shareholder data exists. */
  shareholders_deep?: ShareholdersDeep | null;
  ubos?: UBOInfo;
  shareholdings?: ShareholdingsInfo;
  mergers_and_acquisitions?: MergersAndAcquisitionsInfo;
  network?: OrganizationNetwork;
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

export interface FilterCondition<T = unknown> {
  gte?: T;
  lte?: T;
  gt?: T;
  lt?: T;
  eq?: T;
  exists?: boolean;
}

export interface LocationCoordinates {
  lat: number;
  lon: number;
}

export interface LegacyLocationCoordinates {
  latitude: number;
  longitude: number;
}

export type FilterValue<T> = T | ReadonlyArray<T> | FilterCondition<T>;

export interface OwnershipFilters {
  structure?: FilterValue<OwnershipStructure>;
  owner_managed?: FilterValue<boolean>;
  likely_family_owned?: FilterValue<boolean>;
  largest_share_ratio?: FilterValue<number>;
  oldest_owner_birth_date?: FilterValue<string>;
  youngest_owner_birth_date?: FilterValue<string>;
}

export interface ExecutiveFilters {
  md_oldest_birth_date?: FilterValue<string>;
  md_youngest_birth_date?: FilterValue<string>;
}

export interface LifecycleFilters {
  insolvency_active?: FilterValue<boolean>;
  insolvency_status?: FilterValue<InsolvencyStatus>;
  insolvency_opened_date?: FilterValue<string>;
}

export type StringOrStrings = string | string[];
export type CompanySizeCategory = 'micro' | 'small' | 'medium' | 'large';

export interface SearchOrganizationFilters {
  registration_date_from?: string;
  registration_date_to?: string;
  legal_form_code?: string;
  industry_code?: StringOrStrings;
  industry_scheme?: string;
  active?: boolean;
  status?: OrganizationStatus;
  legal_form_liability_type?: LegalFormLiabilityType;
  postal_code?: string;
  city?: string;
  state?: string;
  location_coordinates?:
    | LocationCoordinates
    | LegacyLocationCoordinates
    | readonly [number, number];
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
  ownership_filters?: OwnershipFilters;
  executive_filters?: ExecutiveFilters;
  lifecycle_filters?: LifecycleFilters;
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
  sort?: SearchSort;
  order?: SortOrder;
  matchContext?: boolean;
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
  _match_context?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SearchOrganizationsResponse {
  results: SearchResultItem[];
  total: number;
  meta?: ApiMeta;
  [key: string]: unknown;
}

export interface IterateSearchOrganizationsParams
  extends Omit<SearchOrganizationsParams, 'limit'> {
  /** Results requested per API call; defaults to and cannot exceed 30. */
  pageSize?: number;
  /** Maximum results to yield. Omit to consume every available page. */
  maxResults?: number;
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

export type DateInput = string | Date;

export interface CursorPagination {
  mode?: string;
  limit?: number;
  returned?: number;
  has_more?: boolean;
  next_cursor?: string | null;
  [key: string]: unknown;
}

export interface AccountResponse {
  meta?: ApiMeta;
  [key: string]: unknown;
}

export interface AccountCreditsResponse extends AccountResponse {
  balance?: Record<string, unknown>;
  bookings?: Array<Record<string, unknown>>;
}

export interface AccountSubscriptionResponse extends AccountResponse {
  /** Current response envelope. `null` means there is no active subscription. */
  subscription?:
    | ({ plan?: string; [key: string]: unknown })
    | null;
  /** Legacy direct response shape retained for compatibility. */
  plan?: string;
}

export interface AccountUsageParams {
  fromDate?: DateInput;
  toDate?: DateInput;
  groupBy?: 'day' | 'month';
}

export interface AccountUsageResponse extends AccountResponse {
  period?: { from?: string; to?: string; [key: string]: unknown };
  totals?: { requests?: number; credits_used?: number; [key: string]: unknown };
  by_endpoint?: Array<{
    endpoint?: string;
    requests?: number;
    credits_used?: number;
    [key: string]: unknown;
  }>;
  series?: {
    group_by?: string;
    buckets?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
}

export interface AccountUsageTransactionsParams {
  fromDate?: DateInput;
  toDate?: DateInput;
  endpoint?: string;
  perPage?: number;
  cursor?: string;
}

export interface AccountUsageTransaction extends Record<string, unknown> {
  endpoint?: string;
  credits?: number;
}

export interface AccountUsageTransactionsResponse extends AccountResponse {
  transactions: AccountUsageTransaction[];
  pagination: CursorPagination;
}

export interface ApiKeyInfo extends Record<string, unknown> {
  id: string | number;
  key?: string;
  masked_key?: string;
  created_at?: string;
  last_used_at?: string | null;
}

export interface ListApiKeysResponse extends AccountResponse {
  api_keys?: ApiKeyInfo[];
}

export interface CreateApiKeyResponse extends AccountResponse {
  api_key?: ApiKeyInfo;
}

export interface ListSignalsParams {
  cursor?: string;
  topics?: string | ReadonlyArray<SignalTopic>;
  organizationIds?: string | ReadonlyArray<string>;
  fromDate?: DateInput;
  toDate?: DateInput;
}

export interface IterateSignalsParams extends Omit<ListSignalsParams, 'cursor'> {
  maxResults?: number;
}

export interface SignalEvent extends Record<string, unknown> {
  id: string;
  topic: SignalTopic;
  topic_name?: LocalizedText;
  occurred_on?: string;
  announced_on?: string;
  date_basis?: string;
}

export interface SignalRecord extends Record<string, unknown> {
  event: SignalEvent;
  organization?: Record<string, unknown>;
  parties?: Record<string, unknown>;
  register_entry?: Record<string, unknown>;
  source?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

export interface SignalsResponse extends AccountResponse {
  signals: SignalRecord[];
  pagination: CursorPagination;
  filters?: Record<string, unknown>;
  warnings?: unknown[];
}

export interface SignalDetailResponse extends AccountResponse {
  signal?: SignalRecord;
}

export interface SignalCatalogResponse extends AccountResponse {
  topics?: Array<Record<string, unknown>>;
  catalog_version?: string;
  capabilities?: Record<string, unknown>;
}

export interface MonitoringPricingResponse extends AccountResponse {
  [key: string]: unknown;
}

export interface Monitor extends Record<string, unknown> {
  id: string;
  entity_id?: string;
  status?: MonitorStatus;
  poll_interval_days?: number;
  label?: string | null;
}

export interface MonitorResponse extends AccountResponse {
  monitor?: Monitor;
  billing_cycle?: Record<string, unknown> | null;
  recent_runs?: Array<Record<string, unknown>>;
}

export interface MonitorsResponse extends AccountResponse {
  monitors?: Monitor[];
}

export interface CreateMonitorParams {
  entityId: string;
  pollIntervalDays: number;
  endpointIds: string | ReadonlyArray<string>;
  label?: string;
  idempotencyKey?: string;
}

export interface WebhookEndpoint extends Record<string, unknown> {
  id: string;
  name?: string;
  url?: string;
  status?: WebhookEndpointStatus;
}

export interface WebhookEndpointResponse extends AccountResponse {
  endpoint?: WebhookEndpoint;
  signing_secret?: string;
  verified?: boolean;
}

export interface WebhookEndpointsResponse extends AccountResponse {
  endpoints?: WebhookEndpoint[];
}

export interface CreateWebhookEndpointParams {
  name: string;
  url: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}

export interface WebhookDelivery extends Record<string, unknown> {
  id: string;
  endpoint_id?: string;
  status?: WebhookDeliveryStatus;
}

export interface WebhookDeliveriesResponse extends AccountResponse {
  deliveries?: WebhookDelivery[];
}

export interface WebhookDeliveryResponse extends AccountResponse {
  delivery?: WebhookDelivery;
}

export interface WebhookEventSummary extends Record<string, unknown> {
  id: string;
  type?: WebhookEventType;
}

export interface WebhookEventsResponse extends AccountResponse {
  events?: WebhookEventSummary[];
}

export interface WebhookEventEnvelope<
  TData extends Record<string, unknown> = Record<string, unknown>,
> extends Record<string, unknown> {
  id: string;
  event_id?: string;
  type: string;
  timestamp?: string;
  schema_version?: number;
  data: TData;
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
