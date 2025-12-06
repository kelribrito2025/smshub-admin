import { getDb } from './db';
import { activations } from '../drizzle/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

/**
 * Calcula a taxa de sucesso de um fornecedor (apiId) para um serviço específico
 * 
 * @param serviceId - ID do serviço (ex: WhatsApp, Telegram)
 * @param apiId - ID do fornecedor (1, 2 ou 3)
 * @param limit - Número de ativações recentes a analisar (padrão: 100)
 * @returns Taxa de sucesso em porcentagem (0-100) e estatísticas
 */
export async function calculateSupplierSuccessRate(
  serviceId: number,
  apiId: number,
  limit: number = 100
): Promise<{
  apiId: number;
  successRate: number;
  totalAnalyzed: number;
  completed: number;
  cancelled: number;
  hasEnoughData: boolean;
}> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Buscar últimas N ativações do fornecedor para este serviço
  // Consideramos apenas: completed (sucesso) e cancelled (falha)
  // Ignoramos: expired (não entra no cálculo)
  const recentActivations = await db
    .select({
      status: activations.status,
    })
    .from(activations)
    .where(
      and(
        eq(activations.serviceId, serviceId),
        eq(activations.apiId, apiId),
        inArray(activations.status, ['completed', 'cancelled'])
      )
    )
    .orderBy(desc(activations.createdAt))
    .limit(limit);

  const totalAnalyzed = recentActivations.length;
  const completed = recentActivations.filter(a => a.status === 'completed').length;
  const cancelled = recentActivations.filter(a => a.status === 'cancelled').length;

  // Calcular taxa de sucesso
  const successRate = totalAnalyzed > 0 
    ? Math.round((completed / totalAnalyzed) * 100) 
    : 0;

  // Consideramos que precisamos de pelo menos 20 ativações para ter dados confiáveis
  const hasEnoughData = totalAnalyzed >= 20;

  return {
    apiId,
    successRate,
    totalAnalyzed,
    completed,
    cancelled,
    hasEnoughData,
  };
}

/**
 * Retorna a melhor opção (apiId) para um serviço baseado na taxa de sucesso
 * 
 * @param serviceId - ID do serviço
 * @param availableApiIds - Lista de IDs de fornecedores disponíveis (ex: [1, 2, 3])
 * @returns apiId recomendado ou null se não houver dados suficientes
 */
export async function getRecommendedSupplier(
  serviceId: number,
  availableApiIds: number[]
): Promise<{
  recommendedApiId: number | null;
  stats: Array<{
    apiId: number;
    successRate: number;
    totalAnalyzed: number;
    completed: number;
    cancelled: number;
    hasEnoughData: boolean;
  }>;
}> {
  // Calcular taxa de sucesso para cada fornecedor
  const statsPromises = availableApiIds.map(apiId => 
    calculateSupplierSuccessRate(serviceId, apiId)
  );
  
  const stats = await Promise.all(statsPromises);

  // Filtrar apenas fornecedores com dados suficientes
  const validStats = stats.filter(s => s.hasEnoughData);

  // Se nenhum fornecedor tem dados suficientes, não recomendamos nenhum
  if (validStats.length === 0) {
    return {
      recommendedApiId: null,
      stats,
    };
  }

  // Encontrar o fornecedor com maior taxa de sucesso
  const best = validStats.reduce((prev, current) => 
    current.successRate > prev.successRate ? current : prev
  );

  return {
    recommendedApiId: best.apiId,
    stats,
  };
}

/**
 * Cache simples em memória para recomendações
 * Evita recalcular a cada requisição (cache de 5 minutos)
 */
const recommendationCache = new Map<string, {
  data: any;
  timestamp: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function getCachedRecommendation(serviceId: number): any | null {
  const key = `service-${serviceId}`;
  const cached = recommendationCache.get(key);
  
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    recommendationCache.delete(key);
    return null;
  }
  
  return cached.data;
}

export function setCachedRecommendation(serviceId: number, data: any): void {
  const key = `service-${serviceId}`;
  recommendationCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Limpa cache de recomendações (útil para testes ou quando ativação é concluída)
 */
export function clearRecommendationCache(serviceId?: number): void {
  if (serviceId) {
    recommendationCache.delete(`service-${serviceId}`);
  } else {
    recommendationCache.clear();
  }
}
