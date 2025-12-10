import { Response } from "express";

/**
 * Notification Manager using Server-Sent Events (SSE)
 * Manages real-time connections to clients
 */

export interface NotificationClient {
  customerId: number;
  sessionId: string; // Unique session ID to allow multiple connections per customer
  response: Response;
  connectedAt: Date;
  role: "admin" | "user"; // Track user role to filter notifications
}

export interface Notification {
  type: "pix_payment_confirmed" | "balance_updated" | "sms_received" | "activation_expired" | "operation_started" | "operation_completed" | "operation_failed" | "recharge_completed" | "admin_notification";
  title: string;
  message: string;
  data?: any;
  playSound?: boolean; // Flag to play sound when admin adds balance
}

class NotificationsManager {
  // Map: customerId -> array of sessions
  private clients: Map<number, NotificationClient[]> = new Map();

  /**
   * Add a new SSE connection for a customer
   * Allows multiple simultaneous connections per customer (different tabs/sessions)
   */
  addClient(customerId: number, sessionId: string, response: Response, role: "admin" | "user" = "user") {
    // Get existing connections for this customer
    const existingClients = this.clients.get(customerId) || [];

    // Close only the connection with the SAME sessionId (if exists)
    const sameSessionClient = existingClients.find(c => c.sessionId === sessionId);
    if (sameSessionClient) {
      try {
        if (!sameSessionClient.response.writableEnded) {
          sameSessionClient.response.end();
        }
      } catch (error) {
        console.error(`[Notifications] Error closing same-session connection:`, error);
      }
    }

    const client: NotificationClient = {
      customerId,
      sessionId,
      response,
      connectedAt: new Date(),
      role,
    };

    // Remove old connection with same sessionId and add new one
    const updatedClients = existingClients.filter(c => c.sessionId !== sessionId);
    updatedClients.push(client);
    this.clients.set(customerId, updatedClients);

    // Setup SSE headers (optimized for production with proxies)
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
      "Access-Control-Allow-Origin": "*", // CORS for SSE
      "Transfer-Encoding": "chunked", // Explicit chunked encoding
    });
    
    // Force flush headers immediately (critical for production SSE)
    response.flushHeaders();
    
    // Disable TCP buffering (Nagle's algorithm) for immediate delivery
    // This is CRITICAL for SSE to work in production environments
    if (response.socket) {
      response.socket.setNoDelay(true);
      // ✅ CRITICAL: Disable socket timeout completely for SSE (0 = no timeout)
      response.socket.setTimeout(0);
    }

    // Send initial connection confirmation immediately
    try {
      response.write(`:connected\n\n`);
    } catch (error) {
      console.error(`[Notifications] Error sending initial message to customer ${customerId}:`, error);
    }

    // Setup cleanup on connection close (only once)
    const closeHandler = () => {
      this.removeClient(customerId, sessionId);
    };
    response.once("close", closeHandler);
    
    // Log connection errors
    response.on("error", (error) => {
      console.error(`[Notifications] ❌ Connection error for customer ${customerId}:`, error);
    });

    // Send heartbeat every 15 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (response.writableEnded) {
        clearInterval(heartbeatInterval);
        return;
      }
      try {
        response.write(":heartbeat\n\n");
      } catch (error) {
        console.error(`[Notifications] Error sending heartbeat:`, error);
        clearInterval(heartbeatInterval);
      }
    }, 15000);

    response.on("close", () => {
      clearInterval(heartbeatInterval);
    });
  }

  /**
   * Remove a client connection by sessionId
   */
  private removeClient(customerId: number, sessionId: string) {
    const clients = this.clients.get(customerId);
    if (!clients) return;

    const updatedClients = clients.filter((c) => c.sessionId !== sessionId);
    
    if (updatedClients.length === 0) {
      this.clients.delete(customerId);
    } else {
      this.clients.set(customerId, updatedClients);
    }
  }

  /**
   * Send notification to specific customer
   */
  sendToCustomer(customerId: number, notification: Notification) {
    const clients = this.clients.get(customerId);
    if (!clients || clients.length === 0) {
      return;
    }

    clients.forEach((client) => {
      this.sendToClient(client.response, notification);
    });
  }

  /**
   * Send notification to all connected clients
   */
  sendToAll(notification: Notification) {
    this.clients.forEach((clients) => {
      clients.forEach((client) => {
        this.sendToClient(client.response, notification);
      });
    });
  }

  /**
   * Send notification to all connected users (exclude admins)
   */
  sendToAllUsers(notification: Notification) {
    this.clients.forEach((clients) => {
      clients.forEach((client) => {
        // Only send to users, skip admins
        if (client.role === "user") {
          this.sendToClient(client.response, notification);
        }
      });
    });
  }

  /**
   * Send SSE message to a specific response stream
   */
  private sendToClient(response: Response, notification: Notification) {
    if (response.writableEnded) {
      return;
    }

    const data = JSON.stringify({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      playSound: notification.playSound,
      timestamp: new Date().toISOString(),
    });

    // Write data and force flush immediately (critical for production SSE)
    response.write(`data: ${data}\n\n`);
    
    // Force flush if available (Node.js HTTP response doesn't have flush() by default,
    // but we can use the socket directly to ensure immediate delivery)
    if ('flush' in response && typeof (response as any).flush === 'function') {
      (response as any).flush();
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    const totalClients = Array.from(this.clients.values()).reduce(
      (sum, clients) => sum + clients.length,
      0
    );

    return {
      totalCustomers: this.clients.size,
      totalConnections: totalClients,
      customers: Array.from(this.clients.entries()).map(([customerId, clients]) => ({
        customerId,
        connections: clients.length,
        connectedAt: clients[0]?.connectedAt,
      })),
    };
  }
}

// Export singleton instance
export const notificationsManager = new NotificationsManager();
