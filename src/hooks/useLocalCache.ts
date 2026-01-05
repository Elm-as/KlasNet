import { useState, useEffect, useCallback } from 'react';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  autoRefresh?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Hook pour gérer un cache local avec TTL
 * Utile pour mettre en cache des données stables (configurations, frais, etc.)
 * @param key - Clé unique pour le cache
 * @param fetchFn - Fonction pour récupérer les données
 * @param options - Options de cache (TTL, auto-refresh)
 */
export function useLocalCache<T>(
  key: string,
  fetchFn: () => T,
  options: CacheOptions = {}
) {
  const { ttl = 5 * 60 * 1000, autoRefresh = true } = options; // 5 minutes par défaut
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const getCacheKey = useCallback(() => `cache_${key}`, [key]);

  const getCachedData = useCallback((): CacheEntry<T> | null => {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('Failed to read cache:', err);
    }
    return null;
  }, [getCacheKey]);

  const setCachedData = useCallback((data: T) => {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(getCacheKey(), JSON.stringify(entry));
    } catch (err) {
      console.warn('Failed to write cache:', err);
    }
  }, [getCacheKey]);

  const isCacheValid = useCallback((entry: CacheEntry<T> | null): boolean => {
    if (!entry) return false;
    return Date.now() - entry.timestamp < ttl;
  }, [ttl]);

  const refresh = useCallback(() => {
    setLoading(true);
    try {
      const freshData = fetchFn();
      setData(freshData);
      setCachedData(freshData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [fetchFn, setCachedData]);

  useEffect(() => {
    const cachedEntry = getCachedData();
    
    if (isCacheValid(cachedEntry)) {
      setData(cachedEntry!.data);
      setLoading(false);
    } else {
      refresh();
    }

    // Auto-refresh quand la fenêtre devient visible
    if (autoRefresh) {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          const entry = getCachedData();
          if (!isCacheValid(entry)) {
            refresh();
          }
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [getCachedData, isCacheValid, refresh, autoRefresh]);

  return { data, loading, error, refresh };
}
