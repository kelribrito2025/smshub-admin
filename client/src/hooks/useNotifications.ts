import { useEffect, useRef, useState } from "react";
import { toast } from 'sonner';

export interface Notification {
  type: "pix_payment_confirmed" | "balance_updated" | "sms_received" | "activation_expired" | "recharge_completed" | "operation_completed" | "operation_failed" | "admin_notification";
  title: string;
  message: string;
  data?: any;
  playSound?: boolean; // Flag to play money sound when admin adds balance
  timestamp: string;
}

interface UseNotificationsOptions {
  customerId: number | null;
  onNotification?: (notification: Notification) => void;
  autoToast?: boolean; // Automatically show toast for notifications
}

// Global state to track active connections per customerId
const activeConnections = new Map<number, number>();

// Circuit breaker state
const circuitBreaker = {
  failureCount: 0,
  lastFailureTime: 0,
  isOpen: false,
  threshold: 3, // Open circuit after 3 consecutive failures (reduced from 5)
  resetTimeout: 5 * 60 * 1000, // Reset after 5 minutes (increased from 1 minute)
  permanentlyDisabled: false, // Flag to permanently disable reconnection after too many failures
};

/**
 * Hook to receive real-time notifications via Server-Sent Events (SSE)
 * 
 * Features:
 * - Single connection per customer (prevents duplicate connections)
 * - BroadcastChannel for sharing notifications across tabs
 * - Circuit breaker to stop retries after consecutive failures
 * - Exponential backoff with increased max delay (60s)
 */
export function useNotifications(options: UseNotificationsOptions) {
  const { customerId, onNotification, autoToast = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<Notification | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const isLeaderRef = useRef(false);
  
  // Store callbacks in refs to avoid recreating EventSource on every render
  const onNotificationRef = useRef(onNotification);
  const autoToastRef = useRef(autoToast);
  
  // Update refs when callbacks change (without triggering reconnection)
  useEffect(() => {
    onNotificationRef.current = onNotification;
    autoToastRef.current = autoToast;
  }, [onNotification, autoToast]);

  useEffect(() => {
    // Don't connect if no customer is authenticated
    if (!customerId || customerId === 0) {
      return;
    }

    // Check circuit breaker
    if (circuitBreaker.permanentlyDisabled) {
      console.error('[Notifications] SSE permanently disabled due to repeated failures. Please refresh the page.');
      return;
    }
    
    if (circuitBreaker.isOpen) {
      const timeSinceLastFailure = Date.now() - circuitBreaker.lastFailureTime;
      if (timeSinceLastFailure < circuitBreaker.resetTimeout) {
        console.warn(`[Notifications] Circuit breaker is OPEN. Waiting ${Math.ceil((circuitBreaker.resetTimeout - timeSinceLastFailure) / 1000)}s before retry`);
        return;
      } else {
        // Reset circuit breaker
        console.log('[Notifications] Circuit breaker RESET after cooldown period');
        circuitBreaker.isOpen = false;
        circuitBreaker.failureCount = 0;
      }
    }

    // Initialize BroadcastChannel for cross-tab communication
    const channelName = `notifications-${customerId}`;
    broadcastChannelRef.current = new BroadcastChannel(channelName);

    // Check if another tab is already connected (leader election)
    const connectionCount = activeConnections.get(customerId) || 0;
    
    if (connectionCount === 0) {
      // This tab becomes the leader
      isLeaderRef.current = true;
      activeConnections.set(customerId, 1);
      console.log(`[Notifications] Tab elected as LEADER for customer ${customerId}`);
    } else {
      // Another tab is already connected, this tab is a follower
      isLeaderRef.current = false;
      console.log(`[Notifications] Tab is FOLLOWER for customer ${customerId}. Listening to BroadcastChannel only.`);
    }

    let abortController = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    // Listen to notifications from other tabs via BroadcastChannel
    const handleBroadcastMessage = (event: MessageEvent) => {
      const notification: Notification = event.data;
      console.log('[useNotifications] Received notification from BroadcastChannel:', notification.type, notification);
      
      setLastNotification(notification);
      
      // Dispatch custom event for components to listen
      window.dispatchEvent(new CustomEvent('notification', { detail: notification }));

      if (onNotificationRef.current) {
        console.log('[useNotifications] Calling onNotification callback (from broadcast):', notification.type);
        onNotificationRef.current(notification);
      }

      if (autoToastRef.current) {
        showNotificationToast(notification);
      }
    };

    broadcastChannelRef.current.addEventListener('message', handleBroadcastMessage);

    // Only leader tab creates SSE connection
    const connectSSE = async () => {
      if (!isLeaderRef.current) {
        console.log(`[Notifications] Skipping SSE connection (follower tab)`);
        return;
      }
      
      // Check if aborted before connecting
      if (abortController.signal.aborted) {
        console.log(`[Notifications] Connection aborted before starting`);
        return;
      }

      try {
        console.log(`[Notifications] Leader tab connecting to SSE for customer ${customerId}...`);
        
        const response = await fetch(`/api/notifications/stream/${customerId}`, {
          method: 'GET',
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          credentials: 'include',
          signal: abortController.signal,
        });

        if (!response.ok) {
          // 403 is expected when admin accesses customer pages - don't log as error
          if (response.status === 403) {
            return; // Silently exit, don't retry
          }
          
          // 429 - Too Many Requests
          if (response.status === 429) {
            console.error(`[Notifications] Rate limit exceeded (429). Incrementing circuit breaker.`);
            circuitBreaker.failureCount++;
            circuitBreaker.lastFailureTime = Date.now();
            
            if (circuitBreaker.failureCount >= circuitBreaker.threshold) {
              circuitBreaker.isOpen = true;
              console.error(`[Notifications] Circuit breaker OPENED after ${circuitBreaker.failureCount} consecutive failures`);
              toast.error('Limite de conexões atingido: O sistema pausará tentativas por 5 minutos. Se o problema persistir, recarregue a página.', { duration: 8000 });
              
              // After 3 circuit breaker openings, permanently disable
              if (circuitBreaker.failureCount >= circuitBreaker.threshold * 3) {
                circuitBreaker.permanentlyDisabled = true;
                toast.error('Sistema de notificações desabilitado: Muitas falhas consecutivas. Por favor, recarregue a página.', { duration: 10000 });
              }
            }
          }
          
          console.error(`[Notifications] SSE connection failed: ${response.status}`);
          throw new Error(`HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        setIsConnected(true);
        retryCountRef.current = 0;
        circuitBreaker.failureCount = 0; // Reset on success

        console.log(`[Notifications] SSE connected successfully for customer ${customerId}`);

        // Read stream
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete messages (separated by \n\n)
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || ''; // Keep incomplete message in buffer

          for (const message of messages) {
            if (!message.trim()) continue;

            // Parse SSE message format: "data: {json}\n"
            const dataMatch = message.match(/^data: (.+)$/m);
            if (dataMatch) {
              try {
                const notification: Notification = JSON.parse(dataMatch[1]);
                console.log('[useNotifications] SSE notification received:', notification.type, notification);

                setLastNotification(notification);

                // Broadcast to other tabs
                if (broadcastChannelRef.current) {
                  console.log('[useNotifications] Broadcasting to other tabs:', notification.type);
                  broadcastChannelRef.current.postMessage(notification);
                }

                // Dispatch custom event for components to listen
                console.log('[useNotifications] Dispatching window event:', notification.type);
                window.dispatchEvent(new CustomEvent('notification', { detail: notification }));

                if (onNotificationRef.current) {
                  console.log('[useNotifications] Calling onNotification callback:', notification.type);
                  onNotificationRef.current(notification);
                }

                if (autoToastRef.current) {
                  showNotificationToast(notification);
                }
              } catch (error) {
                console.error("[Notifications] Error parsing notification:", error);
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return;
        }

        console.error('[Notifications] SSE error:', error);
        setIsConnected(false);

        // Increment circuit breaker on error
        circuitBreaker.failureCount++;
        circuitBreaker.lastFailureTime = Date.now();

        if (circuitBreaker.failureCount >= circuitBreaker.threshold) {
          circuitBreaker.isOpen = true;
          console.error(`[Notifications] Circuit breaker OPENED after ${circuitBreaker.failureCount} consecutive failures`);
          toast.error('Limite de conexões atingido: O sistema pausará tentativas por 5 minutos.', { duration: 8000 });
          
          // After 3 circuit breaker openings, permanently disable
          if (circuitBreaker.failureCount >= circuitBreaker.threshold * 3) {
            circuitBreaker.permanentlyDisabled = true;
            toast.error('Sistema de notificações desabilitado: Muitas falhas consecutivas. Por favor, recarregue a página.', { duration: 10000 });
          }
          return; // Stop retrying
        }

        // Retry with exponential backoff (max delay 2 minutes, starting at 3s)
        const delay = Math.min(3000 * Math.pow(2, retryCountRef.current), 120000);
        retryCountRef.current++;
        
        console.log(`[Notifications] Retrying in ${delay / 1000}s (attempt ${retryCountRef.current})...`);
        
        retryTimeoutRef.current = setTimeout(() => {
          if (customerId) {
            setReconnectTrigger(prev => prev + 1);
          }
        }, delay);
      }
    };

    connectSSE();

    // Cleanup on unmount
    return () => {
      // Clear retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Abort fetch request
      abortController.abort();
      
      // Cancel reader
      if (reader) {
        reader.cancel();
      }
      
      // Close BroadcastChannel
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.removeEventListener('message', handleBroadcastMessage);
        broadcastChannelRef.current.close();
      }
      
      // Decrement connection count
      if (isLeaderRef.current && customerId) {
        const count = activeConnections.get(customerId) || 0;
        if (count > 0) {
          activeConnections.set(customerId, count - 1);
        }
        console.log(`[Notifications] Leader tab disconnected for customer ${customerId}`);
      }
      
      setIsConnected(false);
    };
  }, [customerId, reconnectTrigger]); // Reconnect when customerId changes or retry triggered

  return {
    isConnected,
    lastNotification,
  };
}

/**
 * Show toast notification based on notification type
 */
function showNotificationToast(notification: Notification) {
  switch (notification.type) {
    case "pix_payment_confirmed":
      toast.success(`${notification.title} - ${notification.message}`, {
        duration: 5000,
      });
      break;

    case "balance_updated":
      toast.info(`${notification.title} - ${notification.message}`, {
        duration: 3000,
      });
      break;

    case "sms_received":
      toast.success(`${notification.title} - ${notification.message}`, {
        duration: 5000,
      });
      break;

    case "activation_expired":
      toast.warning(`${notification.title} - ${notification.message}`, {
        duration: 5000,
      });
      break;

    case "operation_completed":
      toast.success(`${notification.title} - ${notification.message}`, {
        duration: 4000,
      });
      break;

    case "operation_failed":
      toast.error(`${notification.title} - ${notification.message}`, {
        duration: 5000,
      });
      break;

    case "admin_notification":
      // ✅ Não mostrar toast - notificações admin aparecem somente na sidebar
      break;

    default:
      toast(`${notification.title} - ${notification.message}`);
  }
}
