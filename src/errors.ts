export class HandelsregisterError extends Error {
  public readonly statusCode?: number;
  public readonly response?: unknown;
  public readonly errorCode?: string;

  constructor(
    message: string,
    statusCode?: number,
    response?: unknown,
    errorCode?: string,
  ) {
    super(message);
    this.name = 'HandelsregisterError';
    this.statusCode = statusCode;
    this.response = response;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, HandelsregisterError.prototype);
  }
}

export class InvalidResponseError extends HandelsregisterError {
  constructor(message: string, response?: unknown) {
    super(message, undefined, response);
    this.name = 'InvalidResponseError';
    Object.setPrototypeOf(this, InvalidResponseError.prototype);
  }
}

export class AuthenticationError extends HandelsregisterError {
  constructor(message: string = 'Invalid or missing API key', response?: unknown) {
    super(message, 401, response);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class PaymentRequiredError extends HandelsregisterError {
  constructor(message: string = 'Insufficient credits', response?: unknown) {
    super(message, 402, response);
    this.name = 'PaymentRequiredError';
    Object.setPrototypeOf(this, PaymentRequiredError.prototype);
  }
}

export class ForbiddenError extends HandelsregisterError {
  constructor(
    message: string = 'The requested operation is forbidden',
    response?: unknown,
    errorCode?: string,
  ) {
    super(message, 403, response, errorCode);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class NotFoundError extends HandelsregisterError {
  constructor(message: string = 'Resource not found', response?: unknown) {
    super(message, 404, response);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class RequestTimeoutError extends HandelsregisterError {
  constructor(message: string = 'API request timed out', response?: unknown) {
    super(message, 408, response);
    this.name = 'RequestTimeoutError';
    Object.setPrototypeOf(this, RequestTimeoutError.prototype);
  }
}

export class RateLimitError extends HandelsregisterError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    response?: unknown,
  ) {
    super(message, 429, response);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class NetworkError extends HandelsregisterError {
  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
    if (originalError) {
      this.stack = originalError.stack;
    }
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class ValidationError extends HandelsregisterError {
  constructor(message: string, response?: unknown) {
    super(message, 400, response);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
