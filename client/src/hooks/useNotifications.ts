import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface Notification {
  type: "pix_payment_confirmed" | "balance_updated" | "sms_received" | "activation_expired" | "recharge_completed";
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

/**
 * Hook to receive real-time notifications via Server-Sent Events (SSE)
 */
export function useNotifications(options: UseNotificationsOptions) {
  const { customerId, onNotification, autoToast = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<Notification | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  
  // Store callbacks in refs to avoid recreating EventSource on every render
  const onNotificationRef = useRef(onNotification);
  const autoToastRef = useRef(autoToast);
  
  // Update refs when callbacks change (without triggering reconnection)
  useEffect(() => {
    onNotificationRef.current = onNotification;
    autoToastRef.current = autoToast;
  }, [onNotification, autoToast]);

  useEffect(() => {
    // ✅ CORREÇÃO: Não conectar se não houver customer autenticado
    if (!customerId || customerId === 0) {
      console.log('[Notifications] Skipping SSE connection - no customer ID provided (customerId:', customerId, ')');
      return;
    }

    console.log(`[Notifications] Connecting to SSE for customer ${customerId}`);

    let abortController = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    // ✅ Use fetch + ReadableStream instead of EventSource to support credentials
    const connectSSE = async () => {
      try {
        const response = await fetch(`/api/notifications/stream/${customerId}`, {
          method: 'GET',
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          credentials: 'include', // ✅ Send cookies with request
          signal: abortController.signal,
        });

        if (!response.ok) {
          // 403 is expected when admin accesses customer pages - don't log as error
          if (response.status === 403) {
            console.log(`[Notifications] SSE connection rejected (403) - user not authorized for this customer`);
            return; // Silently exit, don't retry
          }
          console.error(`[Notifications] SSE connection failed: ${response.status} ${response.statusText}`);
          throw new Error(`HTTP ${response.status}`);
        }

        if (!response.body) {
          console.error('[Notifications] No response body');
          throw new Error('No response body');
        }

        console.log("[Notifications] SSE connection opened");
        setIsConnected(true);
        retryCountRef.current = 0;

        // Read stream
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('[Notifications] Stream ended');
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
                console.log("[Notifications] Received:", notification);

                setLastNotification(notification);

                if (onNotificationRef.current) {
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
          console.log('[Notifications] Connection aborted');
          return;
        }

        console.error('[Notifications] SSE error:', error);
        setIsConnected(false);

        // Retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 32000);
        retryCountRef.current++;
        
        console.log(`[Notifications] Retrying in ${delay}ms (attempt ${retryCountRef.current})`);
        
        retryTimeoutRef.current = setTimeout(() => {
          if (customerId) {
            console.log(`[Notifications] Reconnecting to SSE for customer ${customerId}`);
            setReconnectTrigger(prev => prev + 1);
          }
        }, delay);
      }
    };

    connectSSE();

    // Cleanup on unmount
    return () => {
      console.log("[Notifications] Closing SSE connection");
      
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
      toast.success(notification.title, {
        description: notification.message,
        duration: 5000,
        icon: "💰",
      });
      break;

    case "balance_updated":
      toast.info(notification.title, {
        description: notification.message,
        duration: 3000,
      });
      break;

    case "sms_received":
      toast.success(notification.title, {
        description: notification.message,
        duration: 5000,
        icon: "📱",
      });
      break;

    case "activation_expired":
      toast.warning(notification.title, {
        description: notification.message,
        duration: 5000,
      });
      break;

    default:
      toast(notification.title, {
        description: notification.message,
      });
  }
}
