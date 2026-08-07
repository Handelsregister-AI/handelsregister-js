/** Public constants for the handelsregister.ai API contract. */

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
