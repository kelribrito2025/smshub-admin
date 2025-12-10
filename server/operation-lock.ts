/**
 * Operation Lock Manager
 * 
 * Prevents race conditions when multiple operations are executed concurrently
 * for the same customer (e.g., multiple purchases at the same time).
 * 
 * Uses in-memory locks with automatic cleanup after timeout.
 */

interface LockEntry {
  promise: Promise<void>;
  timestamp: number;
}

class OperationLockManager {
  private locks: Map<number, LockEntry> = new Map();
  private readonly LOCK_TIMEOUT = 30000; // 30 seconds

  /**
   * Execute a function with exclusive lock for a customer
   * If another operation is already running for this customer, wait for it to complete
   */
  async executeWithLock<T>(customerId: number, fn: () => Promise<T>): Promise<T> {
    // Clean up expired locks
    this.cleanupExpiredLocks();

    // Wait for existing lock if any
    const existingLock = this.locks.get(customerId);
    if (existingLock) {
      console.log(`[OperationLock] Waiting for existing operation to complete for customer ${customerId}`);
      await existingLock.promise.catch(() => {
        // Ignore errors from previous operation
      });
    }

    // Create new lock
    let resolveLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    this.locks.set(customerId, {
      promise: lockPromise,
      timestamp: Date.now(),
    });

    try {
      // Execute the function
      const result = await fn();
      return result;
    } finally {
      // Release lock
      resolveLock!();
      this.locks.delete(customerId);
    }
  }

  /**
   * Clean up locks that have been held for too long (likely due to errors)
   */
  private cleanupExpiredLocks() {
    const now = Date.now();
    for (const [customerId, lock] of this.locks.entries()) {
      if (now - lock.timestamp > this.LOCK_TIMEOUT) {
        console.warn(`[OperationLock] Cleaning up expired lock for customer ${customerId}`);
        this.locks.delete(customerId);
      }
    }
  }

  /**
   * Get current lock statistics (for debugging)
   */
  getStats() {
    return {
      activeLocks: this.locks.size,
      customers: Array.from(this.locks.keys()),
    };
  }
}

export const operationLockManager = new OperationLockManager();
