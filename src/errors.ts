export type ResponseHeaders = Record<string, string>;

export class HandelsregisterError extends Error {
  public readonly statusCode?: number;
  /** Parsed response payload. Kept for backward compatibility. */
  public readonly response?: unknown;
  /** Alias matching the Python SDK's error context. */
  public readonly payload?: unknown;
  public readonly errorCode?: string;
  public readonly responseHeaders: ResponseHeaders;

  constructor(
    message: string,
    statusCode?: number,
    response?: unknown,
    errorCode?: string,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message);
    this.name = 'HandelsregisterError';
    this.statusCode = statusCode;
    this.response = response;
    this.payload = response;
    this.errorCode = errorCode;
    this.responseHeaders = responseHeaders;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  get meta(): Record<string, unknown> {
    if (!this.payload || typeof this.payload !== 'object') return {};
    const meta = (this.payload as Record<string, unknown>).meta;
    return meta && typeof meta === 'object' && !Array.isArray(meta)
      ? (meta as Record<string, unknown>)
      : {};
  }

  get detail(): unknown {
    return this.payload && typeof this.payload === 'object'
      ? (this.payload as Record<string, unknown>).detail
      : undefined;
  }
}

export class InvalidResponseError extends HandelsregisterError {
  constructor(message: string, response?: unknown) {
    super(message, undefined, response);
    this.name = 'InvalidResponseError';
  }
}

export class AuthenticationError extends HandelsregisterError {
  constructor(
    message: string = 'Invalid or missing API key',
    response?: unknown,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, 401, response, undefined, responseHeaders);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends HandelsregisterError {
  constructor(
    message: string,
    response?: unknown,
    statusCode: 400 | 422 = 400,
    errorCode?: string,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, statusCode, response, errorCode, responseHeaders);
    this.name = 'ValidationError';
  }
}

export class RequestValidationError extends ValidationError {
  constructor(
    message: string,
    response?: unknown,
    statusCode: 400 | 422 = 422,
    errorCode?: string,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, response, statusCode, errorCode, responseHeaders);
    this.name = 'RequestValidationError';
  }
}

export class PaymentRequiredError extends HandelsregisterError {
  constructor(
    message: string = 'Insufficient credits',
    response?: unknown,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, 402, response, undefined, responseHeaders);
    this.name = 'PaymentRequiredError';
  }
}

/** Preferred name matching the API contract; PaymentRequiredError remains supported. */
export class InsufficientCreditsError extends PaymentRequiredError {
  constructor(
    message: string = 'Insufficient credits',
    response?: unknown,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, response, responseHeaders);
    this.name = 'InsufficientCreditsError';
  }
}

export class ForbiddenError extends HandelsregisterError {
  constructor(
    message: string = 'The requested operation is forbidden',
    response?: unknown,
    errorCode?: string,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, 403, response, errorCode, responseHeaders);
    this.name = 'ForbiddenError';
  }
}

export class SubscriptionRequiredError extends ForbiddenError {
  constructor(
    message: string = 'The requested operation requires another plan',
    response?: unknown,
    errorCode?: string,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, response, errorCode, responseHeaders);
    this.name = 'SubscriptionRequiredError';
  }
}

export class NotFoundError extends HandelsregisterError {
  constructor(
    message: string = 'Resource not found',
    response?: unknown,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, 404, response, undefined, responseHeaders);
    this.name = 'NotFoundError';
  }
}

export class RequestTimeoutError extends HandelsregisterError {
  constructor(
    message: string = 'API request timed out',
    response?: unknown,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, 408, response, undefined, responseHeaders);
    this.name = 'RequestTimeoutError';
  }
}

export class ConflictError extends HandelsregisterError {
  constructor(
    message: string = 'The request conflicts with existing state',
    response?: unknown,
    errorCode?: string,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, 409, response, errorCode, responseHeaders);
    this.name = 'ConflictError';
  }
}

export class IdempotencyConflictError extends ConflictError {
  constructor(
    message: string = 'The idempotency key conflicts with another operation',
    response?: unknown,
    errorCode?: string,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, response, errorCode, responseHeaders);
    this.name = 'IdempotencyConflictError';
  }
}

export class IdempotencyKeyRequiredError extends HandelsregisterError {
  constructor(
    message: string = 'An Idempotency-Key header is required',
    response?: unknown,
    errorCode?: string,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, 428, response, errorCode, responseHeaders);
    this.name = 'IdempotencyKeyRequiredError';
  }
}

export class RateLimitError extends HandelsregisterError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    response?: unknown,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, 429, response, undefined, responseHeaders);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ServerError extends HandelsregisterError {
  constructor(
    message: string = 'The API returned a server error',
    statusCode: number = 500,
    response?: unknown,
    errorCode?: string,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, statusCode, response, errorCode, responseHeaders);
    this.name = 'ServerError';
  }
}

export class ServiceUnavailableError extends ServerError {
  constructor(
    message: string = 'The service is temporarily unavailable',
    response?: unknown,
    errorCode?: string,
    responseHeaders: ResponseHeaders = {},
  ) {
    super(message, 503, response, errorCode, responseHeaders);
    this.name = 'ServiceUnavailableError';
  }
}

export class NetworkError extends HandelsregisterError {
  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
    if (originalError) this.stack = originalError.stack;
  }
}

export class WebhookSignatureError extends HandelsregisterError {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookSignatureError';
  }
}
