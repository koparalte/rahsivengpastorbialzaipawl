
// src/lib/cache.ts

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours, adjust as needed

interface CachedData<T> {
  timestamp: number;
  data: T;
}

function isCacheExpired(timestamp: number): boolean {
  return Date.now() - timestamp > CACHE_EXPIRY_MS;
}

export function getCachedData<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return null;
    }
    const cached: CachedData<any> = JSON.parse(item); // Parse as 'any' first
    if (isCacheExpired(cached.timestamp)) {
      localStorage.removeItem(key);
      return null;
    }

    // Helper to revive date strings to Date objects
    const reviveDates = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          const value = obj[k];
          if (typeof value === 'string') {
            // Attempt to parse if it looks like an ISO date string
            // This regex is a simplified check
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) {
              const d = new Date(value);
              if (!isNaN(d.getTime())) {
                obj[k] = d;
              }
            }
          } else if (typeof value === 'object') {
            reviveDates(value); // Recurse for nested objects/arrays
          }
        }
      }
      return obj;
    };
    
    return reviveDates(cached.data) as T;

  } catch (error) {
    console.error(`Error getting cached data for key "${key}":`, error);
    localStorage.removeItem(key); // Remove corrupted item
    return null;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  try {
    const item: CachedData<T> = {
      timestamp: Date.now(),
      data: data,
    };
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error(`Error setting cached data for key "${key}":`, error);
    // Optionally handle quota exceeded errors, etc.
  }
}
