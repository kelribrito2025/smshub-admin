import { getDb } from './db';
import { activations, services } from '../drizzle/schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';

/**
 * Calcula estatísticas de performance de um fornecedor (API) em um período
 */
export async function getApiPerformanceStats(
  apiId: number,
  days: number = 30
): Promise<{
  apiId: number;
  totalActivations: number;
  completed: number;
  cancelled: number;
  expired: number;
  successRate: number;
  trend: 'up' | 'down' | 'stable';
  dailyStats: Array<{
    date: string;
    total: number;
    completed: number;
    cancelled: number;
    successRate: number;
  }>;
}> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Buscar todas as ativações do período
  const activationsData = await db
    .select({
      status: activations.status,
      createdAt: activations.createdAt,
    })
    .from(activations)
    .where(
      and(
        eq(activations.apiId, apiId),
        gte(activations.createdAt, startDate)
      )
    )
    .orderBy(desc(activations.createdAt));

  // Calcular totais
  const totalActivations = activationsData.length;
  const completed = activationsData.filter(a => a.status === 'completed').length;
  const cancelled = activationsData.filter(a => a.status === 'cancelled').length;
  const expired = activationsData.filter(a => a.status === 'expired').length;

  // Taxa de sucesso (ignora expired)
  const validActivations = completed + cancelled;
  const successRate = validActivations > 0 
    ? Math.round((completed / validActivations) * 100) 
    : 0;

  // Agrupar por dia para histórico
  const dailyMap = new Map<string, { total: number; completed: number; cancelled: number }>();
  
  activationsData.forEach(activation => {
    const date = new Date(activation.createdAt).toISOString().split('T')[0];
    
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { total: 0, completed: 0, cancelled: 0 });
    }
    
    const dayData = dailyMap.get(date)!;
    dayData.total++;
    
    if (activation.status === 'completed') dayData.completed++;
    if (activation.status === 'cancelled') dayData.cancelled++;
  });

  // Converter para array ordenado
  const dailyStats = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      total: data.total,
      completed: data.completed,
      cancelled: data.cancelled,
      successRate: data.completed + data.cancelled > 0
        ? Math.round((data.completed / (data.completed + data.cancelled)) * 100)
        : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calcular tendência (comparar primeira metade vs segunda metade do período)
  const midPoint = Math.floor(dailyStats.length / 2);
  const firstHalf = dailyStats.slice(0, midPoint);
  const secondHalf = dailyStats.slice(midPoint);

  const firstHalfAvg = firstHalf.length > 0
    ? firstHalf.reduce((sum, day) => sum + day.successRate, 0) / firstHalf.length
    : 0;
  
  const secondHalfAvg = secondHalf.length > 0
    ? secondHalf.reduce((sum, day) => sum + day.successRate, 0) / secondHalf.length
    : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (secondHalfAvg > firstHalfAvg + 5) trend = 'up';
  else if (secondHalfAvg < firstHalfAvg - 5) trend = 'down';

  return {
    apiId,
    totalActivations,
    completed,
    cancelled,
    expired,
    successRate,
    trend,
    dailyStats,
  };
}

/**
 * Compara performance de todos os fornecedores
 */
export async function compareApiPerformance(
  days: number = 30
): Promise<Array<{
  apiId: number;
  apiName: string;
  totalActivations: number;
  successRate: number;
  trend: 'up' | 'down' | 'stable';
  ranking: number;
}>> {
  // Buscar estatísticas de cada API (1, 2, 3)
  const apiIds = [1, 2, 3];
  const apiNames = ['Opção 1', 'Opção 2', 'Opção 3'];
  
  const statsPromises = apiIds.map(apiId => getApiPerformanceStats(apiId, days));
  const allStats = await Promise.all(statsPromises);

  // Criar comparação
  const comparison = allStats.map((stats, index) => ({
    apiId: stats.apiId,
    apiName: apiNames[index],
    totalActivations: stats.totalActivations,
    successRate: stats.successRate,
    trend: stats.trend,
    ranking: 0, // Será calculado abaixo
  }));

  // Ordenar por taxa de sucesso e atribuir ranking
  comparison.sort((a, b) => b.successRate - a.successRate);
  comparison.forEach((item, index) => {
    item.ranking = index + 1;
  });

  return comparison;
}

/**
 * Retorna estatísticas detalhadas por serviço e API
 */
export async function getServiceApiPerformance(
  serviceId: number,
  days: number = 30
): Promise<{
  serviceId: number;
  serviceName: string;
  apis: Array<{
    apiId: number;
    apiName: string;
    totalActivations: number;
    successRate: number;
    avgCompletionTime: number | null;
  }>;
}> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Buscar nome do serviço
  const [service] = await db
    .select({ name: services.name })
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);

  if (!service) {
    throw new Error('Service not found');
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const apiIds = [1, 2, 3];
  const apiNames = ['Opção 1', 'Opção 2', 'Opção 3'];

  const apisStats = await Promise.all(
    apiIds.map(async (apiId, index) => {
      const activationsData = await db
        .select({
          status: activations.status,
          createdAt: activations.createdAt,
          completedAt: activations.completedAt,
        })
        .from(activations)
        .where(
          and(
            eq(activations.serviceId, serviceId),
            eq(activations.apiId, apiId),
            gte(activations.createdAt, startDate)
          )
        );

      const total = activationsData.length;
      const completed = activationsData.filter(a => a.status === 'completed').length;
      const cancelled = activationsData.filter(a => a.status === 'cancelled').length;

      const validActivations = completed + cancelled;
      const successRate = validActivations > 0
        ? Math.round((completed / validActivations) * 100)
        : 0;

      // Calcular tempo médio de conclusão (em minutos)
      const completedWithTime = activationsData.filter(
        a => a.status === 'completed' && a.completedAt && a.createdAt
      );

      let avgCompletionTime: number | null = null;
      if (completedWithTime.length > 0) {
        const totalTime = completedWithTime.reduce((sum, a) => {
          const created = new Date(a.createdAt).getTime();
          const completed = new Date(a.completedAt!).getTime();
          return sum + (completed - created);
        }, 0);
        avgCompletionTime = Math.round(totalTime / completedWithTime.length / 1000 / 60); // Converter para minutos
      }

      return {
        apiId,
        apiName: apiNames[index],
        totalActivations: total,
        successRate,
        avgCompletionTime,
      };
    })
  );

  return {
    serviceId,
    serviceName: service.name,
    apis: apisStats,
  };
}
