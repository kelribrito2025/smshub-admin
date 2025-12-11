/**
 * Idempotency Manager
 * Previne duplicação de operações críticas (compras, pagamentos, etc)
 */

interface IdempotencyRecord {
  key: string;
  customerId: number;
  operation: string;
  result: any;
  createdAt: number;
  expiresAt: number;
}

class IdempotencyManager {
  private records: Map<string, IdempotencyRecord> = new Map();
  private readonly DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

  constructor() {
    // Iniciar limpeza periódica de registros expirados
    setInterval(() => this.cleanupExpiredRecords(), this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Gera uma chave de idempotência baseada em parâmetros da operação
   */
  generateKey(customerId: number, operation: string, params: any): string {
    const paramsStr = JSON.stringify(params, Object.keys(params).sort());
    const hash = Buffer.from(`${customerId}:${operation}:${paramsStr}`).toString('base64');
    return hash;
  }

  /**
   * Verifica se operação já foi executada (idempotência)
   * @returns { isDuplicate: boolean, result?: any }
   */
  checkDuplicate(
    idempotencyKey: string,
    customerId: number
  ): { isDuplicate: boolean; result?: any } {
    const record = this.records.get(idempotencyKey);

    if (!record) {
      return { isDuplicate: false };
    }

    // Verificar se registro expirou
    const now = Date.now();
    if (now > record.expiresAt) {
      this.records.delete(idempotencyKey);
      return { isDuplicate: false };
    }

    // Verificar se é do mesmo cliente (segurança)
    if (record.customerId !== customerId) {
      console.warn(
        `[Idempotency] Key collision detected: ${idempotencyKey} (customer ${customerId} vs ${record.customerId})`
      );
      return { isDuplicate: false };
    }

    console.log(
      `[Idempotency] Duplicate operation detected for customer ${customerId}: ${record.operation}`
    );
    return { isDuplicate: true, result: record.result };
  }

  /**
   * Registra resultado de uma operação para idempotência
   */
  recordOperation(
    idempotencyKey: string,
    customerId: number,
    operation: string,
    result: any,
    ttlMs: number = this.DEFAULT_TTL_MS
  ): void {
    const now = Date.now();
    const record: IdempotencyRecord = {
      key: idempotencyKey,
      customerId,
      operation,
      result,
      createdAt: now,
      expiresAt: now + ttlMs,
    };

    this.records.set(idempotencyKey, record);
    console.log(
      `[Idempotency] Recorded operation for customer ${customerId}: ${operation} (expires in ${Math.round(ttlMs / 60000)}min)`
    );
  }

  /**
   * Remove um registro de idempotência (útil para testes ou rollback)
   */
  removeRecord(idempotencyKey: string): void {
    this.records.delete(idempotencyKey);
  }

  /**
   * Limpa registros expirados
   */
  private cleanupExpiredRecords(): void {
    const now = Date.now();
    let cleanedCount = 0;

    Array.from(this.records.entries()).forEach(([key, record]) => {
      if (now > record.expiresAt) {
        this.records.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`[Idempotency] Cleanup completed: ${cleanedCount} expired records removed`);
    }
  }

  /**
   * Retorna estatísticas de registros ativos
   */
  getStats(): {
    totalRecords: number;
    records: Array<{
      customerId: number;
      operation: string;
      createdAt: number;
      expiresAt: number;
    }>;
  } {
    const records = Array.from(this.records.values()).map((record) => ({
      customerId: record.customerId,
      operation: record.operation,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    }));

    return {
      totalRecords: this.records.size,
      records,
    };
  }
}

// Singleton instance
export const idempotencyManager = new IdempotencyManager();
