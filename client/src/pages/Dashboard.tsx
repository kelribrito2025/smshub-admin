import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Activity, DollarSign, TrendingUp, Users, ShoppingCart, LayoutDashboard } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "@/contexts/ToastContext";

import { AnimatedPage } from "@/components/AnimatedPage";
import { AnimatedList, AnimatedListItem } from "@/components/AnimatedList";
import { motion } from "framer-motion";
import { fadeInScale, staggerContainer } from "@/lib/animations";

export default function Dashboard() {
  const { user, loading } = useAuth();

  const { data: dashboardData, isLoading, error } = trpc.stats.getDashboard.useQuery();
  // Fetch balances from all APIs
  const { data: allBalances, isLoading: isLoadingBalances } = trpc.settings.getAllBalances.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (error) {
      if (error.message.includes('API key not configured')) {
        toast.error('Configure a API Key do SMSHub primeiro');
      }
    }
  }, [error]);

  if (loading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = dashboardData?.stats;
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  return (
    <DashboardLayout>
      <AnimatedPage className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <LayoutDashboard className="w-8 h-8 text-blue-500" />
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Visão geral do seu painel administrativo SMSHub
            </p>
          </div>
          <div className="flex gap-2">
            <a href="https://app.numero-virtual.com" target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Painel de Vendas
              </Button>
            </a>
          </div>
        </div>

        {/* Stats Cards */}
        <motion.div 
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeInScale}>
            <Card>
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
                            <span>
                              {api.currency === 'BRL' ? 'R$' : '$'} {api.balance.toFixed(2)}
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
          </motion.div>

          <motion.div variants={fadeInScale}>
            <Card>
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
          </motion.div>

          <motion.div variants={fadeInScale}>
            <Card>
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
          </motion.div>

          <motion.div variants={fadeInScale}>
            <Card>
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
          </motion.div>
        </motion.div>

        {/* Recent Activity and Top Services */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Services */}
          <Card>
            <CardHeader>
              <CardTitle>Serviços Mais Vendidoss</CardTitle>
              <CardDescription>Top 5 serviços por número de vendas</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.topServices && dashboardData.topServices.length > 0 ? (
                <AnimatedList className="space-y-4">
                  {dashboardData.topServices.map((item, index) => (
                    <AnimatedListItem key={index}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{item.service?.name}</p>
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

          {/* Top Countries */}
          <Card>
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

        {/* Recent Activations */}
        <Card>
          <CardHeader>
            <CardTitle>Ativações Recentes</CardTitle>
            <CardDescription>Últimas 10 ativações realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData?.recentActivations && dashboardData.recentActivations.length > 0 ? (
              <AnimatedList className="space-y-3">
                {dashboardData.recentActivations.map((item) => {
                  const activation = item.activation;
                  const service = item.service;
                  const country = item.country;

                  return (
                    <AnimatedListItem key={activation?.id}>
                      <div className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              activation?.status === 'completed'
                                ? 'bg-green-500'
                                : activation?.status === 'cancelled'
                                ? 'bg-red-500'
                                : activation?.status === 'failed'
                                ? 'bg-orange-500'
                                : 'bg-blue-500'
                            }`}
                          />
                          <div>
                            <p className="font-medium">
                              {service?.name} - {country?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activation?.phoneNumber || 'Aguardando número'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium capitalize">
                            {activation?.status === 'completed' ? 'Concluída' :
                             activation?.status === 'cancelled' ? 'Cancelada' :
                             activation?.status === 'failed' ? 'Falhou' :
                             activation?.status === 'active' ? 'Ativa' : 'Pendente'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activation?.createdAt
                              ? new Date(activation.createdAt).toLocaleString('pt-BR')
                              : ''}
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
    </DashboardLayout>
  );
}
