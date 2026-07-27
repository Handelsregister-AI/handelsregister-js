export { Handelsregister } from './client';
export { Company, CompanyOptions } from './company';
export { Person, PersonOptions } from './person';

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
} from './errors';

export * from './types';

export { version } from './version';
