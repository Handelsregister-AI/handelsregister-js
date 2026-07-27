export interface RetryableError {
  statusCode?: number;
  [key: string]: unknown;
}

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: RetryableError, attempt: number) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  shouldRetry: (error: RetryableError) => {
    // Retry on network errors or 5xx status codes
    if (error.statusCode === undefined) return true;
    return error.statusCode >= 500;
  },
};

function normalizeThrownValue(value: unknown): Error {
  if (value instanceof Error) return value;

  const error = new Error('Retry failed with a non-Error value');
  (error as Error & { cause?: unknown }).cause = value;
  return error;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      const retryableError =
        error && typeof error === 'object'
          ? (error as RetryableError)
          : { cause: error };
      if (
        attempt === opts.maxAttempts ||
        !opts.shouldRetry(retryableError, attempt)
      ) {
        throw normalizeThrownValue(error);
      }
      
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelay
      );
      
      await sleep(delay);
    }
  }
  
  if (lastError === undefined) {
    throw new Error('Retry failed without an error');
  }
  throw normalizeThrownValue(lastError);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
