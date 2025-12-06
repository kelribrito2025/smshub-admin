import { describe, it, expect } from 'vitest';
import { calculateFinalPrice } from './price-calculator';

// Testes existentes validam comportamento com BRL (padrão)
// Novos testes validam conversão USD→BRL

describe('calculateFinalPrice', () => {
  it('deve aplicar taxa de lucro corretamente', () => {
    // Cenário: Custo R$ 1,00 (100 centavos) + 150% de lucro = R$ 2,50 (250 centavos)
    const result = calculateFinalPrice(100, 150, 0);
    expect(result).toBe(250);
  });

  it('deve usar preço mínimo quando maior que preço calculado', () => {
    // Cenário: Custo R$ 1,00 + 50% = R$ 1,50 (150 centavos)
    // Mas preço mínimo é R$ 3,00 (300 centavos)
    const result = calculateFinalPrice(100, 50, 300);
    expect(result).toBe(300);
  });

  it('deve usar preço calculado quando maior que preço mínimo', () => {
    // Cenário: Custo R$ 1,00 + 200% = R$ 3,00 (300 centavos)
    // Preço mínimo é R$ 2,00 (200 centavos)
    const result = calculateFinalPrice(100, 200, 200);
    expect(result).toBe(300);
  });

  it('deve aceitar profitPercentage como string (decimal do MySQL)', () => {
    // MySQL decimal retorna string "150.00"
    const result = calculateFinalPrice(100, "150.00", 0);
    expect(result).toBe(250);
  });

  it('deve retornar preço mínimo quando taxa de lucro é 0%', () => {
    // Cenário: Custo R$ 1,00 + 0% = R$ 1,00 (100 centavos)
    // Preço mínimo é R$ 2,00 (200 centavos)
    const result = calculateFinalPrice(100, 0, 200);
    expect(result).toBe(200);
  });

  it('deve calcular corretamente com valores decimais', () => {
    // Cenário: Custo R$ 0,70 (70 centavos) + 150% = R$ 1,75 (175 centavos)
    const result = calculateFinalPrice(70, 150, 0);
    expect(result).toBe(175);
  });

  it('deve arredondar corretamente valores com casas decimais', () => {
    // Cenário: Custo R$ 0,33 (33 centavos) + 150% = R$ 0,825 → arredonda para 83 centavos
    const result = calculateFinalPrice(33, 150, 0);
    expect(result).toBe(83); // Math.round(33 * 2.5) = 83
  });

  it('deve funcionar com taxa de lucro alta (1000%)', () => {
    // Cenário: Custo R$ 1,00 + 1000% = R$ 11,00 (1100 centavos)
    const result = calculateFinalPrice(100, 1000, 0);
    expect(result).toBe(1100);
  });

  it('deve retornar custo original quando taxa é 0% e sem preço mínimo', () => {
    // Cenário: Custo R$ 1,00 + 0% = R$ 1,00 (100 centavos)
    const result = calculateFinalPrice(100, 0, 0);
    expect(result).toBe(100);
  });

  it('deve converter USD para BRL corretamente', () => {
    // Cenário: $0.70 (70 centavos USD) × 6.00 = R$ 4,20 (420 centavos) + 150% = R$ 10,50 (1050 centavos)
    const result = calculateFinalPrice(70, 150, 0, 'USD', 6.0);
    expect(result).toBe(1050);
  });

  it('deve manter preço em BRL sem conversão', () => {
    // Cenário: R$ 1,00 (100 centavos BRL) + 150% = R$ 2,50 (250 centavos)
    const result = calculateFinalPrice(100, 150, 0, 'BRL', 6.0);
    expect(result).toBe(250);
  });

  it('deve aceitar exchangeRate como string (decimal do MySQL)', () => {
    // Cenário: $1.00 (100 centavos USD) × "6.00" = R$ 6,00 (600 centavos) + 100% = R$ 12,00 (1200 centavos)
    const result = calculateFinalPrice(100, 100, 0, 'USD', "6.00");
    expect(result).toBe(1200);
  });

  it('deve aplicar preço mínimo após conversão USD→BRL', () => {
    // Cenário: $0.10 (10 centavos USD) × 6.00 = R$ 0,60 (60 centavos) + 100% = R$ 1,20 (120 centavos)
    // Preço mínimo: R$ 3,00 (300 centavos) → deve retornar 300
    const result = calculateFinalPrice(10, 100, 300, 'USD', 6.0);
    expect(result).toBe(300);
  });
});
