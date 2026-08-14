export { Handelsregister } from './client.js';
export { Company, CompanyOptions } from './company.js';
export { Person, PersonOptions } from './person.js';

export {
  HandelsregisterError,
  InvalidResponseError,
  AuthenticationError,
  PaymentRequiredError,
  ForbiddenError,
  NotFoundError,
  RequestTimeoutError,
  RateLimitError,
  NetworkError,
  ValidationError,
  RequestValidationError,
  InsufficientCreditsError,
  SubscriptionRequiredError,
  ConflictError,
  IdempotencyConflictError,
  IdempotencyKeyRequiredError,
  ServerError,
  ServiceUnavailableError,
  WebhookSignatureError,
} from './errors.js';

export * from './types.js';
export * from './constants.js';
export {
  DEFAULT_TOLERANCE_SECONDS,
  VERIFICATION_RESPONSE_HEADER,
  constructEvent,
  extractVerificationChallenge,
  verificationResponseHeaders,
  verifyWebhookSignature,
} from './webhooks.js';
export type {
  WebhookHeaders,
  WebhookPayload,
  WebhookSecret,
} from './webhooks.js';

export { version } from './version.js';
