import { useState, useEffect } from 'react';

/**
 * Hook pour débouncer une valeur
 * Utile pour les champs de recherche et filtres
 * @param value - La valeur à débouncer
 * @param delay - Le délai en millisecondes (défaut: 300ms)
 * @returns La valeur débouncée
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
