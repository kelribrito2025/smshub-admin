import { useEffect, useState } from 'react';
import { useStoreAuth } from '../contexts/StoreAuthContext';

/**
 * Hook para sincronizar operações críticas entre múltiplos navegadores/dispositivos
 * Escuta eventos SSE e bloqueia ações duplicadas globalmente
 */
export function useOperationLock() {
  const { customer } = useStoreAuth();
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<'purchase' | 'cancel' | null>(null);

  useEffect(() => {
    // ✅ CORREÇÃO: Não conectar se não houver customer autenticado
    if (!customer?.id) {
      console.log('[useOperationLock] Skipping SSE connection - no customer authenticated');
      return;
    }

    console.log(`[useOperationLock] Connecting to SSE for customer ${customer.id}`);

    // Conectar ao SSE endpoint
    // ✅ CORREÇÃO: Usar path param ao invés de query param (conforme backend)
    const eventSource = new EventSource(`/api/notifications/stream/${customer.id}`);

    eventSource.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        
        // Processar eventos de operação
        if (notification.type === 'operation_started') {
          console.log('[useOperationLock] Operation started:', notification.data?.operation);
          setIsOperationInProgress(true);
          setCurrentOperation(notification.data?.operation || null);
        } else if (notification.type === 'operation_completed' || notification.type === 'operation_failed') {
          console.log('[useOperationLock] Operation ended:', notification.data?.operation);
          setIsOperationInProgress(false);
          setCurrentOperation(null);
        }
      } catch (error) {
        console.error('[useOperationLock] Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (event: Event) => {
      const target = event.target as EventSource;
      console.error('[useOperationLock] SSE connection error:', {
        readyState: target.readyState,
        url: target.url,
        eventType: event.type,
      });
      
      // Se a conexão falhou completamente, resetar estado
      if (target.readyState === EventSource.CLOSED) {
        console.log('[useOperationLock] Connection closed, resetting state');
        setIsOperationInProgress(false);
        setCurrentOperation(null);
      }
    };

    // Cleanup ao desmontar
    return () => {
      eventSource.close();
    };
  }, [customer?.id]);

  return {
    isOperationInProgress,
    currentOperation,
    isLocked: isOperationInProgress,
  };
}
