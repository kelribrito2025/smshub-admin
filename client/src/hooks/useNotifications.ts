import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface Notification {
  type: "pix_payment_confirmed" | "balance_updated" | "sms_received" | "activation_expired" | "recharge_completed";
  title: string;
  message: string;
  data?: any;
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
    };

    eventSource.onmessage = (event) => {
      try {
        const notification: Notification = JSON.parse(event.data);
        console.log("[Notifications] Received:", notification);

        setLastNotification(notification);

        // Call custom handler if provided
        if (onNotification) {
          onNotification(notification);
        }

        // Auto-show toast if enabled
        if (autoToast) {
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
      });
      setIsConnected(false);

      // EventSource will automatically try to reconnect
      // Se a conexão falhou completamente, fechar
      if (target.readyState === EventSource.CLOSED) {
        console.log('[Notifications] Connection closed permanently');
      }
    };

    // Cleanup on unmount
    return () => {
      console.log("[Notifications] Closing SSE connection");
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [customerId, onNotification, autoToast]);

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
