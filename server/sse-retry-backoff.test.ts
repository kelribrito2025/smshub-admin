import { describe, it, expect } from 'vitest';

/**
 * Testes para validar lógica de backoff exponencial para reconexão SSE
 */

describe('SSE Retry Backoff Logic', () => {
  /**
   * Calcula delay de backoff exponencial
   * Fórmula: min(1000 * 2^retryCount, 32000)
   */
  function calculateBackoffDelay(retryCount: number): number {
    return Math.min(1000 * Math.pow(2, retryCount), 32000);
  }

  it('deve calcular delays corretos para primeiras 6 tentativas', () => {
    expect(calculateBackoffDelay(0)).toBe(1000);   // 1s
    expect(calculateBackoffDelay(1)).toBe(2000);   // 2s
    expect(calculateBackoffDelay(2)).toBe(4000);   // 4s
    expect(calculateBackoffDelay(3)).toBe(8000);   // 8s
    expect(calculateBackoffDelay(4)).toBe(16000);  // 16s
    expect(calculateBackoffDelay(5)).toBe(32000);  // 32s (máximo)
  });

  it('deve limitar delay máximo a 32 segundos', () => {
    expect(calculateBackoffDelay(6)).toBe(32000);   // 64s → limitado a 32s
    expect(calculateBackoffDelay(7)).toBe(32000);   // 128s → limitado a 32s
    expect(calculateBackoffDelay(10)).toBe(32000);  // 1024s → limitado a 32s
    expect(calculateBackoffDelay(100)).toBe(32000); // Muito grande → limitado a 32s
  });

  it('deve resetar contador após conexão bem-sucedida', () => {
    let retryCount = 5; // Já tentou 5 vezes
    
    // Simula conexão bem-sucedida
    retryCount = 0;
    
    // Próxima tentativa deve ser 1s novamente
    expect(calculateBackoffDelay(retryCount)).toBe(1000);
  });

  it('deve incrementar contador a cada falha', () => {
    let retryCount = 0;
    const delays: number[] = [];
    
    // Simula 6 falhas consecutivas
    for (let i = 0; i < 6; i++) {
      delays.push(calculateBackoffDelay(retryCount));
      retryCount++;
    }
    
    expect(delays).toEqual([1000, 2000, 4000, 8000, 16000, 32000]);
    expect(retryCount).toBe(6);
  });

  it('deve evitar sobrecarga do servidor com delays progressivos', () => {
    // Simula 10 tentativas de reconexão
    const delays: number[] = [];
    for (let i = 0; i < 10; i++) {
      delays.push(calculateBackoffDelay(i));
    }
    
    // Total de tempo esperado até 10ª tentativa
    const totalTime = delays.reduce((sum, delay) => sum + delay, 0);
    
    // Deve ser > 1 minuto (evita spam)
    expect(totalTime).toBeGreaterThan(60000);
    
    // Deve ser < 5 minutos (não espera demais)
    expect(totalTime).toBeLessThan(300000);
  });
});
