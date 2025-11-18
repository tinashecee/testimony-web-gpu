/**
 * Cache service for storing API responses with TTL and invalidation
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default

  /**
   * Set a value in the cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    };
    this.cache.set(key, item);
  }

  /**
   * Get a value from the cache if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Check if a key exists in cache and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove a specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const item of this.cache.values()) {
      if (now - item.timestamp > item.ttl) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
    };
  }

  /**
   * Invalidate cache entries that match a pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    let deleted = 0;
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }
}

// Create a singleton instance
export const cacheService = new CacheService();

// Cache keys constants
export const CACHE_KEYS = {
  RECORDINGS: "recordings:all",
  RECORDINGS_BY_DISTRICT: (district: string) =>
    `recordings:district:${district.toLowerCase()}`,
  RECORDINGS_BY_PROVINCE: (province: string) =>
    `recordings:province:${province.toLowerCase()}`,
  RECORDINGS_BY_REGION: (region: string) =>
    `recordings:region:${region.toLowerCase()}`,
  RECORDING: (id: number) => `recording:${id}`,
  COURTS: "courts:all",
  COURTROOMS: "courtrooms:all",
  USERS: "users:all",
} as const;

// Auto-cleanup expired entries every 2 minutes
setInterval(() => {
  cacheService.clearExpired();
}, 2 * 60 * 1000);
