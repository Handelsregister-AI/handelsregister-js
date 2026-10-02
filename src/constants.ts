/** Public constants for the handelsregister.ai API contract. */

export const OrganizationFeature = {
  RELATED_PERSONS: 'related_persons',
  PUBLICATIONS: 'publications',
  FINANCIAL_KPI: 'financial_kpi',
  BALANCE_SHEET_ACCOUNTS: 'balance_sheet_accounts',
  PROFIT_AND_LOSS_ACCOUNT: 'profit_and_loss_account',
  ANNUAL_FINANCIAL_STATEMENTS: 'annual_financial_statements',
  ANNUAL_FINANCIAL_STATEMENTS_HTML: 'annual_financial_statements__html',
  INSOLVENCY_PUBLICATIONS: 'insolvency_publications',
  NEWS: 'news',
  WEBSITE_CONTENT: 'website_content',
  SHAREHOLDERS: 'shareholders',
  SHAREHOLDERS_DEEP: 'shareholders_deep',
  UBOS: 'ubos',
  SHAREHOLDINGS: 'shareholdings',
  MERGERS_AND_ACQUISITIONS: 'mergers_and_acquisitions',
  NETWORK: 'network',
} as const;

export type OrganizationFeature =
  (typeof OrganizationFeature)[keyof typeof OrganizationFeature];

export const OrganizationStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  TERMINATED: 'TERMINATED',
  DISSOLVED: 'DISSOLVED',
  INSOLVENT: 'INSOLVENT',
} as const;

export type OrganizationStatus =
  (typeof OrganizationStatus)[keyof typeof OrganizationStatus];

export const LegalFormLiabilityType = {
  LIMITED: 'limited',
  UNLIMITED: 'unlimited',
  MIXED: 'mixed',
} as const;

export type LegalFormLiabilityType =
  (typeof LegalFormLiabilityType)[keyof typeof LegalFormLiabilityType];

export const OwnershipStructure = {
  SOLE_PERSON: 'sole_person',
  PARTNERS: 'partners',
  SOLE_COMPANY: 'sole_company',
  FAMILY: 'family',
  FRAGMENTED: 'fragmented',
  CORPORATE_GROUP: 'corporate_group',
} as const;

export type OwnershipStructure =
  (typeof OwnershipStructure)[keyof typeof OwnershipStructure];

export const InsolvencyStatus = {
  OPENED: 'opened',
  PROVISIONAL: 'provisional',
  DISCONTINUED: 'discontinued',
  CONCLUDED: 'concluded',
  REJECTED_NO_ASSETS: 'rejected_no_assets',
  PLAN_MONITORING: 'plan_monitoring',
  OPENING_RESCINDED: 'opening_rescinded',
} as const;

export type InsolvencyStatus =
  (typeof InsolvencyStatus)[keyof typeof InsolvencyStatus];

export const SearchSort = {
  RELEVANCE: 'relevance',
  REGISTRATION_DATE: 'registration_date',
  FINANCIAL_YEAR: 'financial_year',
  REVENUE: 'revenue',
  PROFIT: 'profit',
  EMPLOYEES: 'employees',
  TOTAL_ASSETS: 'total_assets',
  EQUITY: 'equity',
  LIABILITIES: 'liabilities',
  CASH: 'cash',
  EQUITY_RATIO: 'equity_ratio',
  SHARE_CAPITAL: 'share_capital',
  LAST_ACTIVITY: 'last_activity',
  LARGEST_SHARE_RATIO: 'largest_share_ratio',
  MANAGEMENT_SIZE: 'management_size',
  MD_OLDEST_BIRTH_DATE: 'md_oldest_birth_date',
  MD_YOUNGEST_BIRTH_DATE: 'md_youngest_birth_date',
  FB_ENTITY_ID: 'fb_entity_id',
  DISTANCE: 'distance',
} as const;

export type SearchSort = (typeof SearchSort)[keyof typeof SearchSort];

export const SortOrder = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

export const SignalTopic = {
  NEW_REGISTRATIONS: 'NEW_REGISTRATIONS',
  MASTER_DATA_CHANGES: 'MASTER_DATA_CHANGES',
  CLOSURES: 'CLOSURES',
  ROLE_HOLDER_CHANGES: 'ROLE_HOLDER_CHANGES',
  CAPITAL_CHANGES: 'CAPITAL_CHANGES',
  INSOLVENCIES: 'INSOLVENCIES',
  TRANSFORMATIONS: 'TRANSFORMATIONS',
} as const;

export type SignalTopic = (typeof SignalTopic)[keyof typeof SignalTopic];

export const MonitorStatus = {
  INITIALIZING: 'initializing',
  ACTIVE: 'active',
  PAUSED_USER: 'paused_user',
  PAUSED_CONFIGURATION: 'paused_configuration',
  PAUSED_ENTITLEMENT: 'paused_entitlement',
  PAUSED_BILLING: 'paused_billing',
  ERROR: 'error',
  ARCHIVED: 'archived',
} as const;

export type MonitorStatus = (typeof MonitorStatus)[keyof typeof MonitorStatus];

export const WebhookEndpointStatus = {
  PENDING_VERIFICATION: 'pending_verification',
  ACTIVE: 'active',
  DISABLED_USER: 'disabled_user',
  DISABLED_FAILURES: 'disabled_failures',
  ARCHIVED: 'archived',
} as const;

export type WebhookEndpointStatus =
  (typeof WebhookEndpointStatus)[keyof typeof WebhookEndpointStatus];

export const WebhookDeliveryStatus = {
  WITHHELD: 'withheld',
  PENDING: 'pending',
  IN_FLIGHT: 'in_flight',
  RETRY_WAIT: 'retry_wait',
  SUCCEEDED: 'succeeded',
  BLOCKED_ENDPOINT: 'blocked_endpoint',
  EXHAUSTED: 'exhausted',
  CANCELLED: 'cancelled',
} as const;

export type WebhookDeliveryStatus =
  (typeof WebhookDeliveryStatus)[keyof typeof WebhookDeliveryStatus];

export const WebhookEventType = {
  SIGNAL_DETECTED: 'organization.signal.detected',
  SIGNAL_SAMPLE: 'organization.signal.sample',
  ENDPOINT_TEST: 'endpoint.test',
  ENDPOINT_VERIFICATION: 'endpoint.verification',
} as const;

export type WebhookEventType =
  (typeof WebhookEventType)[keyof typeof WebhookEventType];

export const SIGNAL_TOPICS = Object.freeze(Object.values(SignalTopic));
export const ORGANIZATION_FEATURES = Object.freeze(
  Object.values(OrganizationFeature),
);
export const ORGANIZATION_STATUSES = Object.freeze(
  Object.values(OrganizationStatus),
);
export const LEGAL_FORM_LIABILITY_TYPES = Object.freeze(
  Object.values(LegalFormLiabilityType),
);
export const OWNERSHIP_STRUCTURES = Object.freeze(
  Object.values(OwnershipStructure),
);
export const INSOLVENCY_STATUSES = Object.freeze(
  Object.values(InsolvencyStatus),
);
export const SEARCH_SORT_FIELDS = Object.freeze(Object.values(SearchSort));
export const SORT_ORDERS = Object.freeze(Object.values(SortOrder));
export const MONITOR_STATUSES = Object.freeze(Object.values(MonitorStatus));
export const WEBHOOK_ENDPOINT_STATUSES = Object.freeze(
  Object.values(WebhookEndpointStatus),
);
export const WEBHOOK_DELIVERY_STATUSES = Object.freeze(
  Object.values(WebhookDeliveryStatus),
);
export const WEBHOOK_EVENT_TYPES = Object.freeze(Object.values(WebhookEventType));

export const ABILITY_ACCOUNT_READ = 'account:read';
export const ABILITY_MONITORING_MANAGE = 'monitoring:manage';
export const ABILITY_ACCOUNT_KEYS = 'account:keys';

export const MONITOR_MIN_POLL_INTERVAL_DAYS = 1;
export const MONITOR_MAX_POLL_INTERVAL_DAYS = 30;
export const WEBHOOK_MAX_ENDPOINTS = 10;
export const SEARCH_ORGANIZATIONS_MAX_LIMIT = 30;
export const SEARCH_ORGANIZATIONS_MAX_QUERY_LENGTH = 500;
