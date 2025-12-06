/**
 * Sistema de lock em memória para prevenir operações simultâneas por cliente
 * Garante que apenas uma operação crítica (compra/cancelamento) execute por vez
 */

class OperationLockManager {
  private locks: Map<number, Promise<any>> = new Map();

  /**
   * Executa operação com lock exclusivo por cliente
   * Se já houver operação em andamento, aguarda conclusão antes de executar
   */
  async executeWithLock<T>(
    customerId: number,
    operation: () => Promise<T>
  ): Promise<T> {
    // Aguardar operação anterior do mesmo cliente (se houver)
    const existingLock = this.locks.get(customerId);
    if (existingLock) {
      console.log(`[OperationLock] Customer ${customerId} has operation in progress, waiting...`);
      try {
        await existingLock;
      } catch (error) {
        // Ignorar erro da operação anterior
        console.log(`[OperationLock] Previous operation failed, continuing...`);
      }
    }

    // Criar nova promise para esta operação
    const operationPromise = (async () => {
      try {
        console.log(`[OperationLock] Starting operation for customer ${customerId}`);
        const result = await operation();
        console.log(`[OperationLock] Operation completed for customer ${customerId}`);
        return result;
      } catch (error) {
        console.log(`[OperationLock] Operation failed for customer ${customerId}:`, error);
        throw error;
      } finally {
        // Remover lock após conclusão
        this.locks.delete(customerId);
      }
    })();

    // Registrar lock
    this.locks.set(customerId, operationPromise);

    return operationPromise;
  }

  /**
   * Verifica se cliente tem operação em andamento
   */
  isLocked(customerId: number): boolean {
    return this.locks.has(customerId);
  }

  /**
   * Retorna estatísticas de locks ativos
   */
  getStats() {
    return {
      activeOperations: this.locks.size,
      lockedCustomers: Array.from(this.locks.keys()),
    };
  }
}

// Export singleton instance
export const operationLockManager = new OperationLockManager();
