import { CacheEntry } from '../types';

export class Cache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 3600000) { // 1 hour default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const value = this.get(key);
    return value !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  size(): number {
    // Clean up expired entries first
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    return this.cache.size;
  }
}

export function generateCacheKey(params: Record<string, any>): string {
  const sortedKeys = Object.keys(params).sort();
  const keyParts: string[] = [];
  
  for (const key of sortedKeys) {
    const value = params[key];
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        keyParts.push(`${key}:${value.sort().join(',')}`);
      } else {
        keyParts.push(`${key}:${String(value)}`);
      }
    }
  }
  
  return keyParts.join('|');
}