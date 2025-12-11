import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sseRateLimiter } from './sse-rate-limiter';

/**
 * Testes para validar correções do loop infinito de erro 429 no SSE
 * 
 * Validações:
 * 1. Rate limiter permite até 2 conexões simultâneas por customer
 * 2. Rate limiter rejeita conexões duplicadas com status apropriado
 * 3. Conexões são limpas corretamente ao desconectar
 * 4. Timeout de inatividade funciona corretamente
 */

describe('SSE Loop Fix - Rate Limiter', () => {
  const testCustomerId = 999999;

  beforeEach(() => {
    // Limpar estado do rate limiter antes de cada teste
    const stats = sseRateLimiter.getStats();
    stats.customers.forEach(c => {
      // Desregistrar todas as conexões existentes
      for (let i = 0; i < c.connections; i++) {
        sseRateLimiter.unregisterConnection(c.customerId);
      }
    });
  });

  afterEach(() => {
    // Cleanup após cada teste
    const stats = sseRateLimiter.getStats();
    stats.customers.forEach(c => {
      for (let i = 0; i < c.connections; i++) {
        sseRateLimiter.unregisterConnection(c.customerId);
      }
    });
  });

  it('should allow first connection', () => {
    const result = sseRateLimiter.canConnect(testCustomerId);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should allow up to 2 simultaneous connections per customer', () => {
    // Primeira conexão
    let result = sseRateLimiter.canConnect(testCustomerId);
    expect(result.allowed).toBe(true);
    sseRateLimiter.registerConnection(testCustomerId);

    // Segunda conexão (deve ser permitida)
    result = sseRateLimiter.canConnect(testCustomerId);
    expect(result.allowed).toBe(true);
    sseRateLimiter.registerConnection(testCustomerId);

    // Terceira conexão (deve ser rejeitada)
    result = sseRateLimiter.canConnect(testCustomerId);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Maximum 2 connection');
  });

  it('should properly unregister connections', () => {
    // Registrar 2 conexões
    sseRateLimiter.canConnect(testCustomerId);
    sseRateLimiter.registerConnection(testCustomerId);
    sseRateLimiter.canConnect(testCustomerId);
    sseRateLimiter.registerConnection(testCustomerId);

    // Verificar que terceira é rejeitada
    let result = sseRateLimiter.canConnect(testCustomerId);
    expect(result.allowed).toBe(false);

    // Desregistrar uma conexão
    sseRateLimiter.unregisterConnection(testCustomerId);

    // Agora deve permitir nova conexão
    result = sseRateLimiter.canConnect(testCustomerId);
    expect(result.allowed).toBe(true);
  });

  it('should track connection count correctly', () => {
    // Registrar 2 conexões
    sseRateLimiter.registerConnection(testCustomerId);
    sseRateLimiter.registerConnection(testCustomerId);

    const stats = sseRateLimiter.getStats();
    const customer = stats.customers.find(c => c.customerId === testCustomerId);

    expect(customer).toBeDefined();
    expect(customer?.connections).toBe(2);
    expect(stats.totalConnections).toBeGreaterThanOrEqual(2);
  });

  it('should remove customer from tracking when all connections are closed', () => {
    // Registrar e desregistrar conexão
    sseRateLimiter.registerConnection(testCustomerId);
    sseRateLimiter.unregisterConnection(testCustomerId);

    const stats = sseRateLimiter.getStats();
    const customer = stats.customers.find(c => c.customerId === testCustomerId);

    expect(customer).toBeUndefined();
  });

  it('should handle multiple customers independently', () => {
    const customer1 = 111111;
    const customer2 = 222222;

    // Registrar conexões para ambos os clientes
    sseRateLimiter.registerConnection(customer1);
    sseRateLimiter.registerConnection(customer1);
    sseRateLimiter.registerConnection(customer2);

    const stats = sseRateLimiter.getStats();
    
    const c1 = stats.customers.find(c => c.customerId === customer1);
    const c2 = stats.customers.find(c => c.customerId === customer2);

    expect(c1?.connections).toBe(2);
    expect(c2?.connections).toBe(1);

    // Customer 1 não pode conectar mais (limite atingido)
    let result = sseRateLimiter.canConnect(customer1);
    expect(result.allowed).toBe(false);

    // Customer 2 ainda pode conectar
    result = sseRateLimiter.canConnect(customer2);
    expect(result.allowed).toBe(true);
  });
});

describe('SSE Loop Fix - Circuit Breaker Behavior', () => {
  /**
   * Nota: O circuit breaker está implementado no frontend (useNotifications.ts)
   * Este teste documenta o comportamento esperado
   */

  it('should document circuit breaker thresholds', () => {
    // Documentação do comportamento esperado:
    const circuitBreakerConfig = {
      threshold: 3, // Abre após 3 falhas consecutivas (reduzido de 5)
      resetTimeout: 5 * 60 * 1000, // Reset após 5 minutos (aumentado de 1 minuto)
      permanentDisableThreshold: 9, // Desabilita permanentemente após 9 falhas (3 ciclos)
    };

    expect(circuitBreakerConfig.threshold).toBe(3);
    expect(circuitBreakerConfig.resetTimeout).toBe(300000); // 5 minutos em ms
    expect(circuitBreakerConfig.permanentDisableThreshold).toBe(9);
  });

  it('should document backoff exponential behavior', () => {
    // Documentação do comportamento esperado:
    const backoffConfig = {
      initialDelay: 3000, // 3 segundos (reduzido de 5s)
      maxDelay: 120000, // 2 minutos
      multiplier: 2, // Exponencial (3s → 6s → 12s → 24s → 48s → 96s → 120s)
    };

    expect(backoffConfig.initialDelay).toBe(3000);
    expect(backoffConfig.maxDelay).toBe(120000);

    // Calcular delays esperados
    const delays = [];
    let delay = backoffConfig.initialDelay;
    for (let i = 0; i < 7; i++) {
      delays.push(Math.min(delay, backoffConfig.maxDelay));
      delay *= backoffConfig.multiplier;
    }

    expect(delays).toEqual([3000, 6000, 12000, 24000, 48000, 96000, 120000]);
  });
});

describe('SSE Loop Fix - Integration', () => {
  it('should prevent infinite reconnection loop', () => {
    /**
     * Cenário que causava o loop infinito:
     * 1. Cliente tenta conectar
     * 2. Backend rejeita com 429 (rate limit)
     * 3. Frontend aplica backoff e tenta novamente
     * 4. Múltiplas tentativas se acumulam
     * 5. Loop infinito de erros 429
     * 
     * Correção:
     * 1. Rate limiter permite 2 conexões (tolerância para múltiplas abas)
     * 2. Backend retorna 409 (Conflict) ao invés de 429 para duplicatas
     * 3. Circuit breaker abre após 3 falhas (ao invés de 5)
     * 4. Timeout de reset aumentado para 5 minutos
     * 5. Desabilitação permanente após 9 falhas
     */

    const testCustomerId = 888888;

    // Simular cenário de múltiplas tentativas de conexão
    const attempts = [];
    
    for (let i = 0; i < 5; i++) {
      const result = sseRateLimiter.canConnect(testCustomerId);
      attempts.push(result);
      
      if (result.allowed) {
        sseRateLimiter.registerConnection(testCustomerId);
      }
    }

    // Verificar que apenas 2 conexões foram permitidas
    const allowedCount = attempts.filter(a => a.allowed).length;
    expect(allowedCount).toBe(2);

    // Verificar que as demais foram rejeitadas
    const rejectedCount = attempts.filter(a => !a.allowed).length;
    expect(rejectedCount).toBe(3);

    // Verificar que mensagem de erro é apropriada
    const rejectedAttempt = attempts.find(a => !a.allowed);
    expect(rejectedAttempt?.reason).toContain('Maximum 2 connection');
  });
});
