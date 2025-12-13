import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function PerformanceAPIs() {
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  const comparisonQuery = trpc.stats.compareApis.useQuery({ days: period });
  
  const api1Query = trpc.stats.getApiPerformance.useQuery({ apiId: 1, days: period });
  const api2Query = trpc.stats.getApiPerformance.useQuery({ apiId: 2, days: period });
  const api3Query = trpc.stats.getApiPerformance.useQuery({ apiId: 3, days: period });

  const isLoading = comparisonQuery.isLoading || api1Query.isLoading || api2Query.isLoading || api3Query.isLoading;

  // Preparar dados para o gráfico
  const chartData = api1Query.data?.dailyStats.map((day: any, index: number) => ({
    date: new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    'Opção 1': day.successRate,
    'Opção 2': api2Query.data?.dailyStats[index]?.successRate || 0,
    'Opção 3': api3Query.data?.dailyStats[index]?.successRate || 0,
  })) || [];

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 70) return 'text-green-500';
    if (rate >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRankingBadge = (ranking: number) => {
    const colors = ['bg-yellow-500', 'bg-gray-400', 'bg-orange-600'];
    const labels = ['🥇 1º Lugar', '🥈 2º Lugar', '🥉 3º Lugar'];
    return (
      <span className={`px-2 py-1 ${colors[ranking - 1]} text-white text-xs font-bold rounded`}>
        {labels[ranking - 1]}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Activity className="w-8 h-8 text-blue-500" />
              Performance de APIs
            </h1>
            <p className="text-gray-400 mt-2">
              Análise detalhada da taxa de sucesso de cada fornecedor
            </p>
          </div>

          {/* Filtro de período */}
          <div className="flex gap-2">
            <Button
              variant={period === 7 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(7)}
            >
              7 dias
            </Button>
            <Button
              variant={period === 30 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(30)}
            >
              30 dias
            </Button>
            <Button
              variant={period === 90 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(90)}
            >
              90 dias
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-muted-foreground">Carregando estatísticas...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Cards de comparação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {comparisonQuery.data?.map((api: any) => {
                const detailedStats = 
                  api.apiId === 1 ? api1Query.data :
                  api.apiId === 2 ? api2Query.data :
                  api3Query.data;

                return (
                  <Card key={api.apiId} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{api.apiName}</h3>
                        {getRankingBadge(api.ranking)}
                      </div>
                      {getTrendIcon(api.trend)}
                    </div>

                    <div className="space-y-4">
                      {/* Taxa de sucesso */}
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Taxa de Sucesso</p>
                        <p className={`text-3xl font-bold ${getSuccessRateColor(api.successRate)}`}>
                          {api.successRate}%
                        </p>
                      </div>

                      {/* Estatísticas detalhadas */}
                      <div className="space-y-2 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Total de Ativações
                          </span>
                          <span className="font-semibold">{api.totalActivations}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            SMS Recebidos
                          </span>
                          <span className="font-semibold text-green-500">
                            {detailedStats?.completed || 0}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500" />
                            Cancelados
                          </span>
                          <span className="font-semibold text-red-500">
                            {detailedStats?.cancelled || 0}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            Expirados
                          </span>
                          <span className="font-semibold text-gray-500">
                            {detailedStats?.expired || 0}
                          </span>
                        </div>
                      </div>

                      {/* Tendência */}
                      <div className="pt-4 border-t">
                        <p className="text-xs text-muted-foreground">
                          {api.trend === 'up' && '📈 Performance melhorando'}
                          {api.trend === 'down' && '📉 Performance piorando'}
                          {api.trend === 'stable' && '➡️ Performance estável'}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Gráfico de evolução */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Evolução da Taxa de Sucesso</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Acompanhe a performance diária de cada fornecedor nos últimos {period} dias
              </p>

              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      domain={[0, 100]}
                      label={{ value: 'Taxa de Sucesso (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: any) => `${value}%`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="Opção 1" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Opção 2" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Opção 3" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  Sem dados suficientes para exibir o gráfico
                </div>
              )}
            </Card>

            {/* Tabela comparativa */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Comparação Detalhada</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Fornecedor</th>
                      <th className="text-center py-3 px-4 font-semibold">Ranking</th>
                      <th className="text-center py-3 px-4 font-semibold">Taxa de Sucesso</th>
                      <th className="text-center py-3 px-4 font-semibold">Total</th>
                      <th className="text-center py-3 px-4 font-semibold">Completos</th>
                      <th className="text-center py-3 px-4 font-semibold">Cancelados</th>
                      <th className="text-center py-3 px-4 font-semibold">Tendência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonQuery.data?.map((api: any) => {
                      const detailedStats = 
                        api.apiId === 1 ? api1Query.data :
                        api.apiId === 2 ? api2Query.data :
                        api3Query.data;

                      return (
                        <tr key={api.apiId} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{api.apiName}</td>
                          <td className="py-3 px-4 text-center">
                            {getRankingBadge(api.ranking)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-bold ${getSuccessRateColor(api.successRate)}`}>
                              {api.successRate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">{api.totalActivations}</td>
                          <td className="py-3 px-4 text-center text-green-500 font-semibold">
                            {detailedStats?.completed || 0}
                          </td>
                          <td className="py-3 px-4 text-center text-red-500 font-semibold">
                            {detailedStats?.cancelled || 0}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {getTrendIcon(api.trend)}
                              <span className="text-sm">
                                {api.trend === 'up' && 'Melhorando'}
                                {api.trend === 'down' && 'Piorando'}
                                {api.trend === 'stable' && 'Estável'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Legenda */}
            <Card className="p-4 bg-muted/50">
              <h4 className="font-semibold mb-2">📊 Como interpretar os dados:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Taxa de Sucesso:</strong> Porcentagem de ativações que receberam SMS (ignora expirados)</li>
                <li>• <strong>Tendência:</strong> Compara primeira metade vs segunda metade do período</li>
                <li>• <strong>Ranking:</strong> Posição baseada na taxa de sucesso atual</li>
                <li>• <strong>Verde (≥70%):</strong> Performance excelente</li>
                <li>• <strong>Amarelo (50-69%):</strong> Performance moderada</li>
                <li>• <strong>Vermelho (&lt;50%):</strong> Performance baixa - requer atenção</li>
              </ul>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
