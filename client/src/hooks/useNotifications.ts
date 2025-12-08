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
  const eventSourceRef = useRef<EventSource | null>(null);
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
    if (!customerId) {
      console.log('[Notifications] Skipping SSE connection - no customer ID provided');
      return;
    }

    console.log(`[Notifications] Connecting to SSE for customer ${customerId}`);

    // Create EventSource connection
    const eventSource = new EventSource(`/api/notifications/stream/${customerId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("[Notifications] SSE connection opened");
      setIsConnected(true);
      
      // Reset retry counter on successful connection
      retryCountRef.current = 0;
      console.log('[Notifications] Retry counter reset after successful connection');
    };

    eventSource.onmessage = (event) => {
      try {
        const notification: Notification = JSON.parse(event.data);
        console.log("[Notifications] Received:", notification);

        setLastNotification(notification);

        // Call custom handler if provided (using ref to avoid reconnection)
        if (onNotificationRef.current) {
          onNotificationRef.current(notification);
        }

        // Auto-show toast if enabled (using ref to avoid reconnection)
        if (autoToastRef.current) {
          showNotificationToast(notification);
        }
      } catch (error) {
        console.error("[Notifications] Error parsing notification:", error);
      }
    };

    eventSource.onerror = (event: Event) => {
      const target = event.target as EventSource;
      console.error('[Notifications] SSE error:', {
        readyState: target.readyState,
        url: target.url,
        eventType: event.type,
        retryCount: retryCountRef.current,
      });
      setIsConnected(false);

      // If connection closed, implement exponential backoff for reconnection
      if (target.readyState === EventSource.CLOSED) {
        console.log('[Notifications] Connection closed - will retry with exponential backoff');
        
        // Close current connection
        eventSource.close();
        eventSourceRef.current = null;
        
        // Calculate delay with exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s (max)
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 32000);
        retryCountRef.current++;
        
        console.log(`[Notifications] Retrying in ${delay}ms (attempt ${retryCountRef.current})`);
        
        // Schedule reconnection
        retryTimeoutRef.current = setTimeout(() => {
          if (customerId) {
            console.log(`[Notifications] Reconnecting to SSE for customer ${customerId}`);
            // Trigger reconnection by updating state (will cause useEffect to re-run)
            setReconnectTrigger(prev => prev + 1);
          }
        }, delay);
      }
    };

    // Cleanup on unmount
    return () => {
      console.log("[Notifications] Closing SSE connection");
      
      // Clear retry timeout if exists
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Close EventSource
      eventSource.close();
      eventSourceRef.current = null;
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
