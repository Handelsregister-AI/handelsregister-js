import { Cache, generateCacheKey } from '../src/utils/cache';
import { retry, sleep } from '../src/utils/retry';
import { readFile, writeFile, detectFileType } from '../src/utils/fileHandler';
import * as fs from 'fs';
import * as path from 'path';

describe('Cache', () => {
  let cache: Cache<any>;

  beforeEach(() => {
    cache = new Cache<any>(1000); // 1 second TTL
  });

  it('should store and retrieve values', () => {
    cache.set('key1', { data: 'value1' });
    expect(cache.get('key1')).toEqual({ data: 'value1' });
  });

  it('should return null for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should respect TTL', async () => {
    cache.set('key1', 'value1', 100); // 100ms TTL
    expect(cache.get('key1')).toBe('value1');
    
    await sleep(150);
    expect(cache.get('key1')).toBeNull();
  });

  it('should check if key exists', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
  });

  it('should delete keys', () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeNull();
    expect(cache.delete('key1')).toBe(false);
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('should return size and clean expired entries', async () => {
    cache.set('key1', 'value1', 100);
    cache.set('key2', 'value2', 2000);
    expect(cache.size()).toBe(2);
    
    await sleep(150);
    expect(cache.size()).toBe(1); // key1 should be expired
  });
});

describe('generateCacheKey', () => {
  it('should generate consistent keys', () => {
    const params1 = { q: 'test', api_key: 'key123' };
    const params2 = { api_key: 'key123', q: 'test' };
    
    expect(generateCacheKey(params1)).toBe(generateCacheKey(params2));
  });

  it('should handle arrays', () => {
    const params = { features: ['b', 'a', 'c'] };
    const key = generateCacheKey(params);
    expect(key).toBe('features:a,b,c');
  });

  it('should ignore null and undefined values', () => {
    const params = { a: 'test', b: null, c: undefined, d: 'value' };
    const key = generateCacheKey(params);
    expect(key).toBe('a:test|d:value');
  });
});

describe('retry', () => {
  it('should retry on failure', async () => {
    let attempts = 0;
    const fn = jest.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Fail');
      }
      return 'success';
    });

    const result = await retry(fn, { maxAttempts: 3, initialDelay: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after max attempts', async () => {
    const fn = jest.fn(async () => {
      throw new Error('Always fails');
    });

    await expect(
      retry(fn, { maxAttempts: 2, initialDelay: 10 })
    ).rejects.toThrow('Always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry if shouldRetry returns false', async () => {
    const fn = jest.fn(async () => {
      const error: any = new Error('Special error');
      error.statusCode = 400;
      throw error;
    });

    await expect(
      retry(fn, {
        maxAttempts: 3,
        shouldRetry: (error) => error.statusCode !== 400
      })
    ).rejects.toThrow('Special error');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should use exponential backoff', async () => {
    let attempts = 0;
    const fn = jest.fn(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Fail');
      }
      return 'success';
    });

    const start = Date.now();
    await retry(fn, {
      maxAttempts: 3,
      initialDelay: 50,
      backoffFactor: 2
    });
    const duration = Date.now() - start;
    
    // Should take at least 50ms (first retry) + 100ms (second retry) = 150ms
    expect(duration).toBeGreaterThanOrEqual(150);
  });
});

describe('fileHandler', () => {
  const testDir = path.join(__dirname, 'test-files');
  
  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('detectFileType', () => {
    it('should detect JSON files', () => {
      expect(detectFileType('data.json')).toBe('json');
      expect(detectFileType('/path/to/file.JSON')).toBe('json');
    });

    it('should detect CSV files', () => {
      expect(detectFileType('data.csv')).toBe('csv');
      expect(detectFileType('file.CSV')).toBe('csv');
    });

    it('should detect Excel files', () => {
      expect(detectFileType('data.xlsx')).toBe('xlsx');
      expect(detectFileType('file.xls')).toBe('xlsx');
      expect(detectFileType('FILE.XLSX')).toBe('xlsx');
    });

    it('should throw for unknown file types', () => {
      expect(() => detectFileType('file.txt')).toThrow('Cannot detect file type');
      expect(() => detectFileType('file')).toThrow('Cannot detect file type');
    });
  });

  describe('JSON file operations', () => {
    const jsonFile = path.join(testDir, 'test.json');
    const testData = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' }
    ];

    it('should write and read JSON files', async () => {
      await writeFile(jsonFile, testData, 'json');
      const result = await readFile(jsonFile, 'json');
      
      expect(result.data).toEqual(testData);
      expect(result.headers).toEqual(['id', 'name']);
    });

    it('should throw for non-array JSON', async () => {
      fs.writeFileSync(jsonFile, JSON.stringify({ not: 'an array' }));
      await expect(readFile(jsonFile, 'json')).rejects.toThrow('array of objects');
    });
  });

  describe('CSV file operations', () => {
    const csvFile = path.join(testDir, 'test.csv');
    const testData = [
      { name: 'Company A', city: 'Munich' },
      { name: 'Company B', city: 'Berlin' }
    ];

    it('should write and read CSV files', async () => {
      await writeFile(csvFile, testData, 'csv', ['name', 'city']);
      const result = await readFile(csvFile, 'csv');
      
      expect(result.data).toEqual(testData);
      expect(result.headers).toEqual(['name', 'city']);
    });
  });

  describe('error handling', () => {
    it('should throw for non-existent file', async () => {
      await expect(
        readFile('/non/existent/file.json', 'json')
      ).rejects.toThrow('File not found');
    });

    it('should create directory if not exists when writing', async () => {
      const nestedFile = path.join(testDir, 'nested', 'dir', 'file.json');
      await writeFile(nestedFile, [{ test: 'data' }], 'json');
      
      expect(fs.existsSync(nestedFile)).toBe(true);
    });
  });
});