import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayoutWrapper from "@/components/DashboardLayoutWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Activity, DollarSign, TrendingUp, Users, ShoppingCart, LayoutDashboard, ArrowDown, CheckCircle2, XCircle, Download, Loader2, TrendingDown, Minus, Calendar, ChevronDown, RefreshCcw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";

import { AnimatedPage } from "@/components/AnimatedPage";
import { AnimatedList, AnimatedListItem } from "@/components/AnimatedList";
import { motion } from "framer-motion";
import { fadeInScale, staggerContainer } from "@/lib/animations";
import { DraggableCards } from "@/components/DraggableCards";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PeriodFilter = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('last7days');
  const [servicesFilter, setServicesFilter] = useState('Hoje');

  const { data: dashboardData, isLoading, error } = trpc.stats.getDashboard.useQuery();
  
  // Fetch balances from all APIs
  const { data: allBalances, isLoading: isLoadingBalances } = trpc.settings.getAllBalances.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Fetch financial data for the chart based on period filter
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (periodFilter) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate.setDate(endDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last7days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'last30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'last90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
    }
    
    return { startDate, endDate };
  }, [periodFilter]);

  const { data: revenueByPeriod, isLoading: revenueLoading } = trpc.financial.getRevenueByPeriod.useQuery(
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      groupBy: "day",
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const { data: metrics } = trpc.financial.getMetrics.useQuery(
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch refunds for today
  const todayStart = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  const todayEnd = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  }, []);

  const { data: refundsToday } = trpc.financial.getTotalRefunds.useQuery(
    {
      startDate: todayStart,
      endDate: todayEnd,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch refunds for selected period
  const { data: refundsByPeriod } = trpc.financial.getTotalRefunds.useQuery(
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch API comparison data
  const { data: comparisonData, isLoading: comparisonLoading } = trpc.apiPerformance.getComparison.useQuery(
    {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  // Fetch detailed stats for each API
  const { data: api1Stats } = trpc.apiPerformance.getDetailedStats.useQuery(
    { apiId: 1, startDate: dateRange.startDate.toISOString(), endDate: dateRange.endDate.toISOString() },
    { refetchOnWindowFocus: false }
  );
  const { data: api2Stats } = trpc.apiPerformance.getDetailedStats.useQuery(
    { apiId: 2, startDate: dateRange.startDate.toISOString(), endDate: dateRange.endDate.toISOString() },
    { refetchOnWindowFocus: false }
  );
  const { data: api3Stats } = trpc.apiPerformance.getDetailedStats.useQuery(
    { apiId: 3, startDate: dateRange.startDate.toISOString(), endDate: dateRange.endDate.toISOString() },
    { refetchOnWindowFocus: false }
  );

  // Fetch revenue by country and service for tabs
  const { data: revenueByCountry, isLoading: countryLoading } = trpc.financial.getRevenueByCountry.useQuery(
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const { data: revenueByService, isLoading: serviceLoading } = trpc.financial.getRevenueByService.useQuery(
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const { data: recentActivations, isLoading: activationsLoading } =
    trpc.financial.getRecentActivations.useQuery(
      { limit: 20 },
      {
        refetchOnWindowFocus: false,
      }
    );

  useEffect(() => {
    if (error) {
      if (error.message.includes('API key not configured')) {
        toast.error('Configure a API Key do SMSHub primeiro');
      }
    }
  }, [error]);

  if (loading || isLoading) {
    return (
      <DashboardLayoutWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </DashboardLayoutWrapper>
    );
  }

  const stats = dashboardData?.stats;
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getRankingBadge = (ranking: number) => {
    const badges = {
      1: { text: "🥇 1º Lugar", color: "bg-yellow-500/20 text-yellow-500" },
      2: { text: "🥈 2º Lugar", color: "bg-gray-400/20 text-gray-400" },
      3: { text: "🥉 3º Lugar", color: "bg-orange-500/20 text-orange-500" },
    };
    const badge = badges[ranking as keyof typeof badges];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 70) return "text-green-500";
    if (rate >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  return (
    <DashboardLayoutWrapper>
      <AnimatedPage className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <LayoutDashboard className="w-8 h-8 text-blue-500" />
              Dashboard
            </h1>
            <p className="text-gray-400 mt-2">
              Visão geral do seu painel admin
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
              <SelectTrigger className="w-auto min-w-[140px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="last7days">Últi. 7 dias</SelectItem>
                <SelectItem value="last30days">Últi. 30 dias</SelectItem>
                <SelectItem value="last90days">Últi. 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <a href="https://app.numero-virtual.com" target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Painel de vendas
              </Button>
            </a>
          </div>
        </div>

        {/* 8 CARDS KPI COM DRAG AND DROP */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <DraggableCards
            cards={[
              {
                id: 'card-1',
                content: (
                  <Card style={{backgroundColor: '#101010'}}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Saldo das APIs</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {isLoadingBalances ? (
                        <div className="text-sm text-muted-foreground">Carregando...</div>
                      ) : allBalances && allBalances.length > 0 ? (
                        <div className="space-y-2">
                          {allBalances.map((api) => (
                            <div key={api.id} className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">{api.name}</span>
                              <span className="text-sm font-bold">
                                {api.error ? (
                                  <span className="text-red-500 text-xs">Erro</span>
                                ) : (
                                  <span className={api.balance >= 1000 ? 'text-green-600' : 'text-red-600'}>
                                    {api.currency === 'BRL' ? 'R$' : '$'} {api.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Nenhuma API configurada</div>
                      )}
                    </CardContent>
                  </Card>
                ),
              },
              {
                id: 'card-2',
                content: (
                  <Card style={{backgroundColor: '#101010'}}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total de Ativações</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="pt-8">
                      <div className="text-2xl font-bold">{stats?.total || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.completed || 0} concluídas
                      </p>
                    </CardContent>
                  </Card>
                ),
              },
              {
                id: 'card-3',
                content: (
                  <Card style={{backgroundColor: '#101010'}}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="pt-8">
                      <div className="text-2xl font-bold">
                        {formatCurrency(Number(stats?.totalRevenue) || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">Vendas realizadas</p>
                    </CardContent>
                  </Card>
                ),
              },
              {
                id: 'card-4',
                content: (
                  <Card style={{backgroundColor: '#101010'}}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="pt-8">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(Number(stats?.totalProfit) || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Margem de {stats?.totalRevenue ? ((Number(stats.totalProfit) / Number(stats.totalRevenue)) * 100).toFixed(1) : 0}%
                      </p>
                    </CardContent>
                  </Card>
                ),
              },
              {
                id: 'card-5',
                content: (
                  <div className="font-sans bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-neutral-400 text-sm">Custo Total</span>
                      <TrendingDown size={18} className="text-red-500" />
                    </div>
                    <div className="text-3xl font-light text-red-500 mb-1">
                      {formatCurrency(Number(metrics?.totalCost) || 0)}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Lucro médio: {formatCurrency(Number(metrics?.averageProfit) || 0)}
                    </div>
                  </div>
                ),
              },
              {
                id: 'card-6',
                content: (
                  <div className="font-sans bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-neutral-400 text-sm">Taxa de Sucesso</span>
                      <Activity size={18} className="text-neutral-500" />
                    </div>
                    <div className="text-3xl font-light text-white mb-1">
                      {metrics?.totalActivations
                        ? formatPercent(
                            (metrics.completedActivations / metrics.totalActivations) * 100
                          )
                        : "0%"}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-500">{metrics?.completedActivations || 0} ✓</span>
                      <span className="text-red-500">{metrics?.cancelledActivations || 0} ✗</span>
                    </div>
                  </div>
                ),
              },
              {
                id: 'card-7',
                content: (
                  <div className="font-sans bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-neutral-400 text-sm">Total de Reembolsos</span>
                      <RefreshCcw size={18} className="text-blue-500" />
                    </div>
                    <div className="text-3xl font-light text-blue-500 mb-1">
                      {formatCurrency(Number(refundsToday) || 0)}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Período selecionado: {formatCurrency(Number(refundsByPeriod) || 0)}
                    </div>
                  </div>
                ),
              },
              {
                id: 'card-8',
                content: (
                  <div className="font-sans bg-neutral-900/50 border border-dashed border-neutral-700 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-neutral-500 text-sm">Em breve</span>
                    </div>
                    <div className="text-3xl font-light text-neutral-600 mb-1">
                      —
                    </div>
                    <div className="text-xs text-neutral-600">
                      Novos dados em breve
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </motion.div>

        {/* 3) GRÁFICO - Evolução de Receita e Lucro */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="font-sans bg-neutral-900/50 border border-neutral-800 p-1 rounded-xl">
            <TabsTrigger 
              value="revenue" 
              className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white rounded-lg px-4 py-2 transition-all"
            >
              Receita & Lucro
            </TabsTrigger>
            <TabsTrigger 
              value="country"
              className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white rounded-lg px-4 py-2 transition-all"
            >
              Por País
            </TabsTrigger>
            <TabsTrigger 
              value="service"
              className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white rounded-lg px-4 py-2 transition-all"
            >
              Por Serviço
            </TabsTrigger>
            <TabsTrigger 
              value="transactions"
              className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white rounded-lg px-4 py-2 transition-all"
            >
              Transações
            </TabsTrigger>
          </TabsList>

          {/* Revenue Chart */}
          <TabsContent value="revenue" className="space-y-4">
            <Card className="font-sans bg-neutral-900/50 border border-neutral-800 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-xl font-semibold text-white">Evolução de Receita e Lucro</CardTitle>
                  <CardDescription className="text-sm text-neutral-400 mt-1">Análise temporal de desempenho financeiro</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-neutral-700 hover:bg-neutral-800 text-white"
                  onClick={() => {
                    if (revenueByPeriod && revenueByPeriod.length > 0) {
                      const csv = [
                        ['Data', 'Receita', 'Custo', 'Lucro'].join(','),
                        ...revenueByPeriod.map(row => 
                          [row.date, row.revenue, row.cost, row.profit].join(',')
                        )
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'receita_por_periodo.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  disabled={!revenueByPeriod || revenueByPeriod.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : revenueByPeriod && revenueByPeriod.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={revenueByPeriod}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(250, 60%, 60%)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(250, 60%, 60%)" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(160, 50%, 50%)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(160, 50%, 50%)" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(0, 60%, 60%)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(0, 60%, 60%)" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="5 5" stroke="#333" opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#888"
                        tick={{ fill: '#888', fontSize: 12 }}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatCurrency(value)} 
                        stroke="#888"
                        tick={{ fill: '#888', fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          backgroundColor: '#1a1a1a', 
                          border: '1px solid #333',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Legend 
                        wrapperStyle={{ color: '#888' }}
                        iconType="line"
                      />
                      <Area
                        type="monotone"
                        dataKey="cost"
                        name="Custo"
                        stroke="hsl(0, 60%, 60%)"
                        fill="url(#colorCost)"
                        strokeWidth={2}
                        stackId="1"
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        name="Lucro"
                        stroke="hsl(160, 50%, 50%)"
                        fill="url(#colorProfit)"
                        strokeWidth={2}
                        stackId="1"
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Receita"
                        stroke="hsl(250, 60%, 60%)"
                        fill="url(#colorRevenue)"
                        strokeWidth={2}
                        stackId="1"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    Nenhum dado disponível para o período selecionado
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Country Chart */}
          <TabsContent value="country" className="space-y-4">
            <Card className="font-sans bg-neutral-900/50 border border-neutral-800 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-xl font-semibold text-white">Receita por País</CardTitle>
                  <CardDescription className="text-sm text-neutral-400 mt-1">Top países por lucro gerado</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-neutral-700 hover:bg-neutral-800 text-white"
                  onClick={() => {
                    if (revenueByCountry && revenueByCountry.length > 0) {
                      const csv = [
                        ['País', 'Ativações', 'Receita', 'Custo', 'Lucro'].join(','),
                        ...revenueByCountry.map(row => 
                          [row.countryCode, row.activations, row.revenue, row.cost, row.profit].join(',')
                        )
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'receita_por_pais.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  disabled={!revenueByCountry || revenueByCountry.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                {countryLoading ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : revenueByCountry && revenueByCountry.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={revenueByCountry.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="countryCode" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelStyle={{ color: "#000" }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Receita" fill="#8884d8" />
                      <Bar dataKey="profit" name="Lucro" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Chart */}
          <TabsContent value="service" className="space-y-4">
            <Card className="font-sans bg-neutral-900/50 border border-neutral-800 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-xl font-semibold text-white">Receita por Serviço</CardTitle>
                  <CardDescription className="text-sm text-neutral-400 mt-1">Top serviços por lucro gerado</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-neutral-700 hover:bg-neutral-800 text-white"
                  onClick={() => {
                    if (revenueByService && revenueByService.length > 0) {
                      const csv = [
                        ['Serviço', 'Ativações', 'Receita', 'Custo', 'Lucro'].join(','),
                        ...revenueByService.map(row => 
                          [row.serviceName, row.activations, row.revenue, row.cost, row.profit].join(',')
                        )
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'receita_por_servico.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  disabled={!revenueByService || revenueByService.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                {serviceLoading ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : revenueByService && revenueByService.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={revenueByService.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="serviceName" angle={-45} textAnchor="end" height={100} />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelStyle={{ color: "#000" }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Receita" fill="#8884d8" />
                      <Bar dataKey="profit" name="Lucro" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card className="font-sans bg-neutral-900/50 border border-neutral-800 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-xl font-semibold text-white">Transações Recentes</CardTitle>
                  <CardDescription className="text-sm text-neutral-400 mt-1">Últimas 20 ativações realizadas</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-neutral-700 hover:bg-neutral-800 text-white"
                  onClick={() => {
                    if (recentActivations) {
                      const data = recentActivations.map((item) => ({
                        id: item.activation.id,
                        data: item.activation.createdAt,
                        pais: item.country?.name || "N/A",
                        servico: item.service?.name || "N/A",
                        telefone: item.activation.phoneNumber || "N/A",
                        status: item.activation.status,
                        receita: item.activation.sellingPrice / 100,
                        custo: item.activation.smshubCost / 100,
                        lucro: item.activation.profit / 100,
                      }));
                      const headers = Object.keys(data[0]).join(",");
                      const rows = data.map((row) => Object.values(row).join(",")).join("\n");
                      const csv = `${headers}\n${rows}`;
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(blob);
                      link.download = `transacoes_recentes_${new Date().toISOString().split("T")[0]}.csv`;
                      link.click();
                      toast.success("Relatório exportado com sucesso!");
                    }
                  }}
                  disabled={!recentActivations || recentActivations.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                {activationsLoading ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : recentActivations && recentActivations.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>País</TableHead>
                          <TableHead>Serviço</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Receita</TableHead>
                          <TableHead className="text-right">Custo</TableHead>
                          <TableHead className="text-right">Lucro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentActivations.map((item) => (
                          <TableRow key={item.activation.id}>
                            <TableCell className="font-mono text-xs">
                              #{item.activation.id}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(item.activation.createdAt).toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell>{item.country?.name || "N/A"}</TableCell>
                            <TableCell>{item.service?.name || "N/A"}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {item.activation.phoneNumber || "N/A"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  item.activation.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : item.activation.status === "active"
                                      ? "bg-blue-100 text-blue-800"
                                      : item.activation.status === "cancelled"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {item.activation.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.activation.sellingPrice)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.activation.smshubCost)}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {formatCurrency(item.activation.profit)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    Nenhuma transação encontrada
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 3) DOIS CARDS LADO A LADO - Serviços e Países */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Serviços Mais Vendidos */}
          <div className="font-sans bg-neutral-900/50 border border-neutral-800 rounded-xl p-6" style={{backgroundColor: '#101010'}}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-white mb-1">Serviços Mais Vendidos</h2>
                <p className="text-sm text-neutral-500">Top 15 serviços por número de vendas</p>
              </div>

              <div className="relative">
                <select
                  value={servicesFilter}
                  onChange={(e) => setServicesFilter(e.target.value)}
                  className="appearance-none bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 pr-10 text-white text-sm cursor-pointer hover:border-neutral-700 transition-colors focus:outline-none focus:border-blue-500"
                >
                  <option>Hoje</option>
                  <option>Ontem</option>
                  <option>Semana passada</option>
                  <option>Mês passado</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            <div className="h-[360px] overflow-y-auto pr-2 space-y-4 scrollbar-thin">
              {dashboardData?.topServices && dashboardData.topServices.length > 0 ? (
                dashboardData.topServices.slice(0, 15).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-neutral-500 text-sm font-medium w-6">{index + 1}</span>
                      <div>
                        <div className="text-white text-sm">{item.service?.name}</div>
                        <div className="text-neutral-500 text-xs">{item.count} vendas</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white text-sm">{formatCurrency(Number(item.revenue) || 0)}</div>
                      <div className={`text-xs ${Number(item.profit) < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {Number(item.profit) < 0 ? '' : '+'}{formatCurrency(Number(item.profit) || 0)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-400">
                  Nenhuma venda registrada ainda
                </div>
              )}
            </div>
          </div>

          {/* Países Mais Utilizados */}
          <Card style={{backgroundColor: '#101010'}}>
            <CardHeader>
              <CardTitle>Países Mais Utilizados</CardTitle>
              <CardDescription>Top 5 países por número de vendas</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.topCountries && dashboardData.topCountries.length > 0 ? (
                <AnimatedList className="space-y-4">
                  {dashboardData.topCountries.map((item, index) => (
                    <AnimatedListItem key={index}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{item.country?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.count} vendas
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(Number(item.revenue) || 0)}</p>
                          <p className="text-xs text-green-600">
                            +{formatCurrency(Number(item.profit) || 0)}
                          </p>
                        </div>
                      </div>
                    </AnimatedListItem>
                  ))}
                </AnimatedList>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma venda registrada ainda
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 4) CARD GRANDE - Comparação Detalhada */}
        <Card className="p-6" style={{backgroundColor: '#101010'}}>
          <h3 className="text-lg font-semibold mb-4">Comparação Detalhada</h3>
          {comparisonLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : comparisonData && comparisonData.length > 0 ? (
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
                  {comparisonData.map((api) => {
                    const detailedStats = 
                      api.apiId === 1 ? api1Stats :
                      api.apiId === 2 ? api2Stats :
                      api3Stats;

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
                        <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                          {getTrendIcon(api.trend)}
                          <span className="text-sm">
                            {api.trend === 'up' && 'Melhorando'}
                            {api.trend === 'down' && 'Piorando'}
                            {api.trend === 'stable' && 'Estável'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </Card>

        {/* 5) CARD GRANDE - Ativações Recentes (20 últimas) */}
        <Card style={{backgroundColor: '#101010'}}>
          <CardHeader>
            <CardTitle>Ativações Recentes</CardTitle>
            <CardDescription>Últimas 20 ativações realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData?.recentActivations && dashboardData.recentActivations.length > 0 ? (
              <AnimatedList className="space-y-3">
                {dashboardData.recentActivations.slice(0, 20).map((item) => {
                  const activation = item.activation;
                  const service = item.service;
                  const country = item.country;

                  return (
                    <AnimatedListItem key={activation?.id}>
                      <div className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              activation?.status === "completed"
                                ? "bg-green-500"
                                : activation?.status === "active"
                                  ? "bg-blue-500"
                                  : activation?.status === "cancelled"
                                    ? "bg-red-500"
                                    : "bg-gray-500"
                            }`}
                          />
                          <div>
                            <p className="font-medium text-sm">
                              {service?.name} - {country?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activation?.phoneNumber || "N/A"} • {activation?.createdAt ? new Date(activation.createdAt).toLocaleString("pt-BR") : "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatCurrency(Number(activation?.sellingPrice) || 0)}
                          </p>
                          <p className="text-xs text-green-600">
                            +{formatCurrency(Number(activation?.profit) || 0)}
                          </p>
                        </div>
                      </div>
                    </AnimatedListItem>
                  );
                })}
              </AnimatedList>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma ativação registrada ainda
              </div>
            )}
          </CardContent>
        </Card>
      </AnimatedPage>
    </DashboardLayoutWrapper>
  );
}
