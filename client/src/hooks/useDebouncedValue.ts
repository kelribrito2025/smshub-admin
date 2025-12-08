import { useEffect, useState } from 'react';

/**
 * Hook to debounce a value (e.g., search input)
 * Only updates the debounced value after the user stops typing for `delay` ms
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebouncedValue(searchTerm, 500);
 * 
 * // Use debouncedSearchTerm in queries instead of searchTerm
 * const { data } = trpc.prices.getAll.useQuery({
 *   searchTerm: debouncedSearchTerm,
 * });
 */
export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if value changes before delay expires
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
