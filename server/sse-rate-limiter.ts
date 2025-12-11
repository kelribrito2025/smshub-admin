/**
 * SSE Rate Limiter
 * Controla múltiplas conexões SSE por cliente para evitar sobrecarga
 */

interface ConnectionInfo {
  customerId: number;
  connectedAt: number;
  lastActivity: number;
  connectionCount: number;
}

class SSERateLimiter {
  private connections: Map<number, ConnectionInfo> = new Map();
  private readonly MAX_CONNECTIONS_PER_CUSTOMER = 2; // Allow 2 connections for multi-tab tolerance
  private readonly CONNECTION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

  constructor() {
    // Iniciar limpeza periódica de conexões inativas
    setInterval(() => this.cleanupInactiveConnections(), this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Verifica se o cliente pode criar uma nova conexão SSE
   * @returns { allowed: boolean, reason?: string }
   */
  canConnect(customerId: number): { allowed: boolean; reason?: string } {
    const existing = this.connections.get(customerId);
    const now = Date.now();

    if (!existing) {
      return { allowed: true };
    }

    // Verificar se conexão expirou (timeout)
    const timeSinceLastActivity = now - existing.lastActivity;
    if (timeSinceLastActivity > this.CONNECTION_TIMEOUT_MS) {
      // Conexão expirada, permitir nova
      this.connections.delete(customerId);
      return { allowed: true };
    }

    // Verificar limite de conexões simultâneas
    if (existing.connectionCount >= this.MAX_CONNECTIONS_PER_CUSTOMER) {
      console.warn(
        `[SSE Rate Limiter] Customer ${customerId} already has ${existing.connectionCount} active connection(s)`
      );
      return {
        allowed: false,
        reason: `Maximum ${this.MAX_CONNECTIONS_PER_CUSTOMER} connection(s) per customer. Please close other tabs or wait for existing connection to timeout.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Registra uma nova conexão SSE
   */
  registerConnection(customerId: number): void {
    const now = Date.now();
    const existing = this.connections.get(customerId);

    if (existing) {
      // Incrementar contador de conexões
      existing.connectionCount++;
      existing.lastActivity = now;
      console.log(
        `[SSE Rate Limiter] Customer ${customerId} connection count: ${existing.connectionCount}`
      );
    } else {
      // Primeira conexão
      this.connections.set(customerId, {
        customerId,
        connectedAt: now,
        lastActivity: now,
        connectionCount: 1,
      });
      console.log(`[SSE Rate Limiter] Customer ${customerId} registered first connection`);
    }
  }

  /**
   * Remove uma conexão SSE (quando cliente desconecta)
   */
  unregisterConnection(customerId: number): void {
    const existing = this.connections.get(customerId);

    if (existing) {
      existing.connectionCount--;
      console.log(
        `[SSE Rate Limiter] Customer ${customerId} disconnected, remaining connections: ${existing.connectionCount}`
      );

      // Remover completamente se não há mais conexões
      if (existing.connectionCount <= 0) {
        this.connections.delete(customerId);
        console.log(`[SSE Rate Limiter] Customer ${customerId} removed (no active connections)`);
      }
    }
  }

  /**
   * Atualiza timestamp de última atividade
   */
  updateActivity(customerId: number): void {
    const existing = this.connections.get(customerId);
    if (existing) {
      existing.lastActivity = Date.now();
    }
  }

  /**
   * Limpa conexões inativas (timeout)
   */
  private cleanupInactiveConnections(): void {
    const now = Date.now();
    let cleanedCount = 0;

    Array.from(this.connections.entries()).forEach(([customerId, info]) => {
      const timeSinceLastActivity = now - info.lastActivity;
      if (timeSinceLastActivity > this.CONNECTION_TIMEOUT_MS) {
        this.connections.delete(customerId);
        cleanedCount++;
        console.log(
          `[SSE Rate Limiter] Cleaned up inactive connection for customer ${customerId} (inactive for ${Math.round(timeSinceLastActivity / 60000)}min)`
        );
      }
    });

    if (cleanedCount > 0) {
      console.log(`[SSE Rate Limiter] Cleanup completed: ${cleanedCount} inactive connections removed`);
    }
  }

  /**
   * Retorna estatísticas de conexões ativas
   */
  getStats(): {
    totalCustomers: number;
    totalConnections: number;
    customers: Array<{ customerId: number; connections: number; lastActivity: number }>;
  } {
    const customers = Array.from(this.connections.values()).map((info) => ({
      customerId: info.customerId,
      connections: info.connectionCount,
      lastActivity: info.lastActivity,
    }));

    const totalConnections = customers.reduce((sum, c) => sum + c.connections, 0);

    return {
      totalCustomers: this.connections.size,
      totalConnections,
      customers,
    };
  }
}

// Singleton instance
export const sseRateLimiter = new SSERateLimiter();
