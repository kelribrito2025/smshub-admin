import { useCallback, useRef } from 'react';

/**
 * Hook para criar callbacks com debounce
 * Útil para prevenir múltiplas execuções rápidas (ex: cliques duplos)
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Atualizar ref do callback para sempre usar a versão mais recente
  callbackRef.current = callback;

  return useCallback(
    (...args: Parameters<T>) => {
      // Cancelar timeout anterior se existir
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Agendar nova execução
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}
