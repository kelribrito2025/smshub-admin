/**
 * Calcula o preço final de venda baseado na configuração da API
 * 
 * Lógica:
 * 1. Converte preço para BRL se a API estiver em USD (aplica exchangeRate)
 * 2. Aplica taxa de lucro sobre o custo: custoAPI * (1 + profitPercentage/100)
 * 3. Compara com o preço mínimo configurado
 * 4. Retorna o maior valor entre os dois
 * 
 * @param smshubPrice - Preço do serviço da API em centavos (na moeda original)
 * @param profitPercentage - Taxa de lucro em % (ex: 150 para 150%)
 * @param minimumPrice - Preço mínimo em centavos BRL (ex: 300 para R$ 3,00)
 * @param currency - Moeda da API ("BRL" ou "USD")
 * @param exchangeRate - Taxa de câmbio USD→BRL (ex: 6.00 para $1 = R$6)
 * @returns Preço final em centavos BRL
 */
export function calculateFinalPrice(
  smshubPrice: number,
  profitPercentage: number | string,
  minimumPrice: number,
  currency: string = 'BRL',
  exchangeRate: number | string = 1.0
): number {
  // Converter profitPercentage para número se vier como string (do decimal do MySQL)
  const profitPct = typeof profitPercentage === 'string' 
    ? parseFloat(profitPercentage) 
    : profitPercentage;

  // Converter exchangeRate para número se vier como string
  const rate = typeof exchangeRate === 'string'
    ? parseFloat(exchangeRate)
    : exchangeRate;

  // Converter preço para BRL se necessário
  const priceInBRL = currency === 'USD' 
    ? Math.round(smshubPrice * rate)
    : smshubPrice;

  // Calcular preço com taxa de lucro
  const priceWithProfit = Math.round(priceInBRL * (1 + profitPct / 100));

  // Retornar o maior valor entre preço calculado e preço mínimo
  return Math.max(priceWithProfit, minimumPrice);
}
