export class HandelsregisterError extends Error {
  public readonly statusCode?: number;
  public readonly response?: any;

  constructor(message: string, statusCode?: number, response?: any) {
    super(message);
    this.name = 'HandelsregisterError';
    this.statusCode = statusCode;
    this.response = response;
    Object.setPrototypeOf(this, HandelsregisterError.prototype);
  }
}

export class InvalidResponseError extends HandelsregisterError {
  constructor(message: string, response?: any) {
    super(message, undefined, response);
    this.name = 'InvalidResponseError';
    Object.setPrototypeOf(this, InvalidResponseError.prototype);
  }
}

export class AuthenticationError extends HandelsregisterError {
  constructor(message: string = 'Invalid or missing API key') {
    super(message, 401);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class RateLimitError extends HandelsregisterError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429);
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
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}