import { Response } from "express";

/**
 * Notification Manager using Server-Sent Events (SSE)
 * Manages real-time connections to clients
 */

export interface NotificationClient {
  customerId: number;
  response: Response;
  connectedAt: Date;
}

export interface Notification {
  type: "pix_payment_confirmed" | "balance_updated" | "sms_received" | "activation_expired" | "operation_started" | "operation_completed" | "operation_failed" | "recharge_completed";
  title: string;
  message: string;
  data?: any;
  playSound?: boolean; // Flag to play sound when admin adds balance
}

class NotificationsManager {
  private clients: Map<number, NotificationClient[]> = new Map();

  /**
   * Add a new SSE connection for a customer
   */
  addClient(customerId: number, response: Response) {
    const client: NotificationClient = {
      customerId,
      response,
      connectedAt: new Date(),
    };

    const existingClients = this.clients.get(customerId) || [];
    existingClients.push(client);
    this.clients.set(customerId, existingClients);

    console.log(`[Notifications] Client connected: customer ${customerId}, total connections: ${existingClients.length}`);

    // Setup SSE headers
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    });

    // Connection established - no need to send confirmation toast

    // Setup cleanup on connection close
    response.on("close", () => {
      this.removeClient(customerId, response);
    });

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (response.writableEnded) {
        clearInterval(heartbeatInterval);
        return;
      }
      response.write(":heartbeat\n\n");
    }, 30000);

    response.on("close", () => {
      clearInterval(heartbeatInterval);
    });
  }

  /**
   * Remove a client connection
   */
  private removeClient(customerId: number, response: Response) {
    const clients = this.clients.get(customerId);
    if (!clients) return;

    const updatedClients = clients.filter((c) => c.response !== response);
    
    if (updatedClients.length === 0) {
      this.clients.delete(customerId);
    } else {
      this.clients.set(customerId, updatedClients);
    }

    console.log(`[Notifications] Client disconnected: customer ${customerId}, remaining connections: ${updatedClients.length}`);
  }

  /**
   * Send notification to specific customer
   */
  sendToCustomer(customerId: number, notification: Notification) {
    const clients = this.clients.get(customerId);
    if (!clients || clients.length === 0) {
      console.log(`[Notifications] No clients connected for customer ${customerId}`);
      return;
    }

    console.log(`[Notifications] Sending to customer ${customerId}:`, notification.type);

    clients.forEach((client) => {
      this.sendToClient(client.response, notification);
    });
  }

  /**
   * Send notification to all connected clients
   */
  sendToAll(notification: Notification) {
    let totalSent = 0;
    
    this.clients.forEach((clients, customerId) => {
      clients.forEach((client) => {
        this.sendToClient(client.response, notification);
        totalSent++;
      });
    });

    console.log(`[Notifications] Broadcast sent to ${totalSent} clients`);
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

    response.write(`data: ${data}\n\n`);
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
