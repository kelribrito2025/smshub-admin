import DashboardLayout from "@/components/DashboardLayout";
import { FinancialSkeleton } from "@/components/FinancialSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  ArrowDown,
  ArrowUp,
  DollarSign,
  Download,
  Loader2,
  TrendingUp,
  Activity,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { toast } from "sonner";
import { AnimatedPage } from "@/components/AnimatedPage";
import { motion } from "framer-motion";
import { fadeInScale, staggerContainer } from "@/lib/animations";


type PeriodType = "7days" | "30days" | "90days" | "year" | "all";
type GroupByType = "day" | "week" | "month";

export default function Financial() {
  const [period, setPeriod] = useState<PeriodType>("30days");
  const [groupBy, setGroupBy] = useState<GroupByType>("day");



  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case "7days":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30days":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90days":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case "all":
        startDate = new Date(2020, 0, 1); // Start from 2020
        break;
    }

    return { startDate, endDate };
  }, [period]);

  // Fetch financial data
  const { data: metrics, isLoading: metricsLoading } = trpc.financial.getMetrics.useQuery(
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    {
      refetchOnWindowFocus: false, // Prevent refetch on window focus
      // staleTime herdado do QueryClient global (5 minutos)
    }
  );

  const { data: revenueByPeriod, isLoading: revenueLoading } =
    trpc.financial.getRevenueByPeriod.useQuery(
      {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        groupBy,
      },
      {
        refetchOnWindowFocus: false,
        // staleTime herdado do QueryClient global (5 minutos)
      }
    );

  const { data: revenueByCountry, isLoading: countryLoading } =
    trpc.financial.getRevenueByCountry.useQuery(
      {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      {
        refetchOnWindowFocus: false,
        // staleTime herdado do QueryClient global (5 minutos)
      }
    );

  const { data: revenueByService, isLoading: serviceLoading } =
    trpc.financial.getRevenueByService.useQuery(
      {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      {
        refetchOnWindowFocus: false,
        // staleTime herdado do QueryClient global (5 minutos)
      }
    );

  const { data: recentActivations, isLoading: activationsLoading } =
    trpc.financial.getRecentActivations.useQuery(
      { limit: 20 },
      {
        refetchOnWindowFocus: false,
        // staleTime herdado do QueryClient global (5 minutos)
      }
    );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast.success("Relatório exportado com sucesso!");
  };

  if (metricsLoading) {
    return (
      <DashboardLayout>
        <FinancialSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AnimatedPage className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-blue-500" />
              Relatórios Financeiros
            </h1>
            <p className="text-muted-foreground mt-1">
              Análise detalhada de receita, custos e lucro
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="90days">Últimos 90 dias</SelectItem>
                <SelectItem value="year">Último ano</SelectItem>
                <SelectItem value="all">Todo período</SelectItem>
              </SelectContent>
            </Select>

            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByType)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Por dia</SelectItem>
                <SelectItem value="week">Por semana</SelectItem>
                <SelectItem value="month">Por mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(metrics?.totalRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.totalActivations || 0} ativações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics?.totalProfit || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Margem: {formatPercent(metrics?.profitMargin || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(metrics?.totalCost || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Lucro médio: {formatCurrency(metrics?.averageProfit || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.totalActivations
                  ? formatPercent(
                      (metrics.completedActivations / metrics.totalActivations) * 100
                    )
                  : "0%"}
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  {metrics?.completedActivations || 0}
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-600" />
                  {metrics?.cancelledActivations || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">Receita & Lucro</TabsTrigger>
            <TabsTrigger value="country">Por País</TabsTrigger>
            <TabsTrigger value="service">Por Serviço</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
          </TabsList>

          {/* Revenue Chart */}
          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Evolução de Receita e Lucro</CardTitle>
                  <CardDescription>Análise temporal de desempenho financeiro</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(revenueByPeriod || [], "receita_por_periodo")}
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
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelStyle={{ color: "#000" }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Receita"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        name="Lucro"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="cost"
                        name="Custo"
                        stroke="#ff7c7c"
                        fill="#ff7c7c"
                        fillOpacity={0.6}
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Receita por País</CardTitle>
                  <CardDescription>Top países por lucro gerado</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(revenueByCountry || [], "receita_por_pais")}
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

            {/* Country Table */}
            {revenueByCountry && revenueByCountry.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento por País</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>País</TableHead>
                          <TableHead className="text-right">Ativações</TableHead>
                          <TableHead className="text-right">Receita</TableHead>
                          <TableHead className="text-right">Custo</TableHead>
                          <TableHead className="text-right">Lucro</TableHead>
                          <TableHead className="text-right">Margem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {revenueByCountry.map((country) => (
                          <TableRow key={country.countryId}>
                            <TableCell className="font-medium">
                              {country.countryCode} - {country.countryName}
                            </TableCell>
                            <TableCell className="text-right">{country.activations}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(country.revenue)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(country.cost)}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {formatCurrency(country.profit)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPercent((country.profit / country.revenue) * 100)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Service Chart */}
          <TabsContent value="service" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Receita por Serviço</CardTitle>
                  <CardDescription>Top serviços por lucro gerado</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(revenueByService || [], "receita_por_servico")}
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
                      <XAxis dataKey="serviceCode" />
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

            {/* Service Table */}
            {revenueByService && revenueByService.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento por Serviço</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Serviço</TableHead>
                          <TableHead className="text-right">Ativações</TableHead>
                          <TableHead className="text-right">Receita</TableHead>
                          <TableHead className="text-right">Custo</TableHead>
                          <TableHead className="text-right">Lucro</TableHead>
                          <TableHead className="text-right">Margem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {revenueByService.map((service) => (
                          <TableRow key={service.serviceId}>
                            <TableCell className="font-medium">
                              {service.serviceCode} - {service.serviceName}
                            </TableCell>
                            <TableCell className="text-right">{service.activations}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(service.revenue)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(service.cost)}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {formatCurrency(service.profit)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPercent((service.profit / service.revenue) * 100)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Transactions Table */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Transações Recentes</CardTitle>
                  <CardDescription>Últimas 20 ativações realizadas</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
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
                      exportToCSV(data, "transacoes_recentes");
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
      </AnimatedPage>
    </DashboardLayout>
  );
}
