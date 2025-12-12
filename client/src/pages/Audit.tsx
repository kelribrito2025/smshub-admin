import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingCart,
  RefreshCw,
  Search,
  Download,
  FileText,
  User,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Shield,
  Smartphone,
  Settings,
  Loader2,
} from 'lucide-react';
import { toast } from '@/contexts/ToastContext';
import TableSkeleton from '../components/TableSkeleton';
import DashboardLayout from '../components/DashboardLayout';

export default function Audit() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 500); // ✅ Debounce to avoid 429
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [activationId, setActivationId] = useState<number | undefined>();
  const [type, setType] = useState<'credit' | 'debit' | 'purchase' | 'refund' | 'all'>('all');
  const [origin, setOrigin] = useState<'api' | 'customer' | 'admin' | 'system' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const utils = trpc.useUtils();

  // Mutation para corrigir saldo
  const fixBalanceMutation = trpc.audit.fixBalance.useMutation({
    onSuccess: (data, variables) => {
      toast.success(`Saldo corrigido com sucesso! Ajuste: R$ ${(Math.abs(data.adjustment) / 100).toFixed(2)}`);
      // Invalidar queries para atualizar dados
      utils.audit.checkInconsistencies.invalidate();
      utils.audit.getTransactions.invalidate();
      utils.audit.getStats.invalidate();
    },
    onError: (error) => {
      // Ignorar erro de cliente não encontrado (pode ter sido deletado)
      if (error.message.includes('Cliente não encontrado')) {
        console.warn('Cliente não encontrado - provavelmente foi deletado');
        // Invalidar queries para atualizar lista
        utils.audit.checkInconsistencies.invalidate();
        return;
      }
      toast.error(`Erro ao corrigir saldo: ${error.message}`);
    },
  });

  // Função para corrigir todos os saldos de uma vez
  const handleFixAllBalances = async () => {
    if (!inconsistenciesQuery.data?.inconsistencies) return;

    const inconsistencies = inconsistenciesQuery.data.inconsistencies;
    let successCount = 0;
    let errorCount = 0;

    toast.info(`Corrigindo todos os saldos... Processando ${inconsistencies.length} cliente(s)`);

    for (const inc of inconsistencies) {
      try {
        await fixBalanceMutation.mutateAsync({ customerId: inc.customerId });
        successCount++;
      } catch (error: any) {
        // Ignorar erro de cliente não encontrado (pode ter sido deletado)
        if (error.message && error.message.includes('Cliente não encontrado')) {
          console.warn(`Cliente ${inc.customerId} não encontrado - provavelmente foi deletado`);
          continue; // Pular para o próximo
        }
        errorCount++;
        console.error(`Erro ao corrigir saldo do cliente ${inc.customerId}:`, error);
      }
    }

    if (errorCount === 0) {
      toast.success(`Todos os saldos corrigidos! ${successCount} cliente(s) ajustado(s) com sucesso`);
    } else {
      toast.warning(`Correção parcial: ${successCount} sucesso, ${errorCount} erro(s)`);
    }
  };

  // Query para transações
  const transactionsQuery = trpc.audit.getTransactions.useQuery({
    customerId,
    activationId,
    searchTerm: debouncedSearchTerm.trim() || undefined,
    type,
    origin,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit,
  });

  // Query para estatísticas
  const statsQuery = trpc.audit.getStats.useQuery({
    customerId,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Query para verificar inconsistências
  const inconsistenciesQuery = trpc.audit.checkInconsistencies.useQuery({
    customerId,
  });

  const handleExport = async () => {
    if (!customerId) {
      toast.error('Selecione um cliente para exportar');
      return;
    }

    try {
      const data = await utils.audit.exportTransactions.fetch({
        customerId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      // Criar PDF usando jsPDF (você precisará instalar: pnpm add jspdf)
      // Por enquanto, vamos apenas baixar como JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria-${data.customer.name}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Relatório exportado com sucesso!');
    } catch (error: any) {
      toast.error(`Erro ao exportar relatório: ${error.message}`);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setCustomerId(undefined);
    setActivationId(undefined);
    setType('all');
    setOrigin('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const formatCurrency = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <ArrowUpCircle className="w-5 h-5 text-green-500" />;
      case 'debit':
        return <ArrowDownCircle className="w-5 h-5 text-red-500" />;
      case 'purchase':
        return <ShoppingCart className="w-5 h-5 text-blue-500" />;
      case 'refund':
        return <RefreshCw className="w-5 h-5 text-yellow-500" />;
      default:
        return <DollarSign className="w-5 h-5 text-gray-500" />;
    }
  };

  const getOriginIcon = (origin: string) => {
    switch (origin) {
      case 'api':
        return <Activity className="w-4 h-4 text-blue-400" />;
      case 'customer':
        return <User className="w-4 h-4 text-green-400" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-purple-400" />;
      case 'system':
        return <Settings className="w-4 h-4 text-gray-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      credit: 'Crédito',
      debit: 'Débito',
      purchase: 'Compra',
      refund: 'Reembolso',
    };
    return labels[type] || type;
  };

  const getOriginLabel = (origin: string) => {
    const labels: Record<string, string> = {
      api: 'API',
      customer: 'Cliente',
      admin: 'Admin',
      system: 'Sistema',
    };
    return labels[origin] || origin;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <FileText className="w-8 h-8 text-blue-500" />
          Auditoria de Saldo
        </h1>
        <p className="text-gray-400 mt-1">
          Rastreamento completo de todas as alterações de saldo dos clientes
        </p>
      </div>

      {/* Alerta de Inconsistências */}
      {inconsistenciesQuery.data && inconsistenciesQuery.data.totalInconsistent > 0 && (
        <Card className="bg-red-900/20 border-red-700">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <Shield className="w-5 h-5" />
                  ⚠️ Inconsistências Detectadas
                </CardTitle>
                <CardDescription className="text-red-300">
                  {inconsistenciesQuery.data.totalInconsistent} cliente(s) com saldo suspeito detectado
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-green-600 text-green-400 hover:bg-green-900/30"
                onClick={handleFixAllBalances}
                disabled={fixBalanceMutation.isPending}
              >
                {fixBalanceMutation.isPending ? (
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                ) : null}
                Corrigir Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inconsistenciesQuery.data.inconsistencies.slice(0, 3).map((inc: any) => (
                <div key={inc.customerId} className="bg-red-950/30 p-3 rounded-lg border border-red-800">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-white">
                        {inc.customerName} (PIN: {inc.customerPin})
                      </div>
                      <div className="text-sm text-gray-400">{inc.customerEmail}</div>
                      <div className="flex gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-gray-400">Saldo Real:</span>
                          <span className="ml-2 font-medium text-white">
                            R$ {(inc.actualBalance / 100).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Esperado:</span>
                          <span className="ml-2 font-medium text-white">
                            R$ {(inc.expectedBalance / 100).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Diferença:</span>
                          <span className={`ml-2 font-bold ${
                            inc.difference > 0 ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {inc.difference > 0 ? '+' : ''}
                            R$ {(inc.difference / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        inc.severity === 'high' ? 'bg-red-900 text-red-200' :
                        inc.severity === 'medium' ? 'bg-orange-900 text-orange-200' :
                        'bg-yellow-900 text-yellow-200'
                      }`}>
                        {inc.severity === 'high' ? 'CRÍTICO' :
                         inc.severity === 'medium' ? 'MÉDIO' : 'BAIXO'}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-600 text-green-400 hover:bg-green-900/30"
                        onClick={() => fixBalanceMutation.mutate({ customerId: inc.customerId })}
                        disabled={fixBalanceMutation.isPending}
                      >
                        {fixBalanceMutation.isPending ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : null}
                        Corrigir Saldo
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {inconsistenciesQuery.data.totalInconsistent > 3 && (
                <div className="text-center text-sm text-gray-400">
                  + {inconsistenciesQuery.data.totalInconsistent - 3} outros clientes com inconsistências
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas */}
      {statsQuery.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Total de Transações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{statsQuery.data.total.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {statsQuery.data.byType.map((item) => (
                  <div key={item.type} className="flex justify-between">
                    <span className="text-gray-400">{getTypeLabel(item.type)}:</span>
                    <span className="text-white font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {statsQuery.data.byOrigin.map((item) => (
                  <div key={item.origin} className="flex justify-between">
                    <span className="text-gray-400">{getOriginLabel(item.origin)}:</span>
                    <span className="text-white font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros Avançados
          </CardTitle>
          <CardDescription>Refine sua busca por cliente, ativação, data ou tipo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca por termo */}
            <div className="space-y-2">
              <Label htmlFor="search">Buscar Cliente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome, email ou PIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-900/50 border-gray-600 text-white"
                />
              </div>
            </div>

            {/* ID do Cliente */}
            <div className="space-y-2">
              <Label htmlFor="customerId">ID do Cliente</Label>
              <Input
                id="customerId"
                type="number"
                placeholder="Ex: 123"
                value={customerId || ''}
                onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-gray-900/50 border-gray-600 text-white"
              />
            </div>

            {/* ID da Ativação */}
            <div className="space-y-2">
              <Label htmlFor="activationId">ID da Ativação</Label>
              <Input
                id="activationId"
                type="number"
                placeholder="Ex: 456"
                value={activationId || ''}
                onChange={(e) => setActivationId(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-gray-900/50 border-gray-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={type} onValueChange={(value: any) => setType(value)}>
                <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="debit">Débito</SelectItem>
                  <SelectItem value="purchase">Compra</SelectItem>
                  <SelectItem value="refund">Reembolso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Origem */}
            <div className="space-y-2">
              <Label htmlFor="origin">Origem</Label>
              <Select value={origin} onValueChange={(value: any) => setOrigin(value)}>
                <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="customer">Cliente</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data Início */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-900/50 border-gray-600 text-white"
              />
            </div>

            {/* Data Fim */}
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-900/50 border-gray-600 text-white"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleClearFilters}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Limpar Filtros
            </Button>
            <Button
              onClick={handleExport}
              disabled={!customerId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Transações */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle>Timeline de Transações</CardTitle>
          <CardDescription>
            {transactionsQuery.data
              ? `Mostrando ${transactionsQuery.data.data.length} de ${transactionsQuery.data.pagination.total} transações`
              : 'Carregando...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsQuery.data && transactionsQuery.data.data.length > 0 || transactionsQuery.isLoading ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-gray-800/50">
                      <TableHead className="text-gray-400">ID</TableHead>
                      <TableHead className="text-gray-400">Cliente</TableHead>
                      <TableHead className="text-gray-400">Tipo</TableHead>
                      <TableHead className="text-gray-400">Origem</TableHead>
                      <TableHead className="text-gray-400">Descrição</TableHead>
                      <TableHead className="text-gray-400 text-right">Saldo Antes</TableHead>
                      <TableHead className="text-gray-400 text-right">Valor</TableHead>
                      <TableHead className="text-gray-400 text-right">Saldo Depois</TableHead>
                      <TableHead className="text-gray-400">Ativação</TableHead>
                      <TableHead className="text-gray-400">Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsQuery.isLoading ? (
                      <TableSkeleton rows={10} columns={10} />
                    ) : (
                    transactionsQuery.data?.data.map((row) => {
                      const t = row.transaction;
                      const customer = row.customer;
                      const activation = row.activation;
                      const service = row.service;

                      return (
                        <TableRow key={t.id} className="border-gray-700 hover:bg-gray-800/30">
                          <TableCell className="font-mono text-gray-400 text-sm">#{t.id}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-white font-medium">{customer?.name}</span>
                              <span className="text-gray-400 text-xs">PIN: {customer?.pin}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTypeIcon(t.type)}
                              <span className="text-white">{getTypeLabel(t.type)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getOriginIcon(t.origin || 'system')}
                              <span className="text-gray-300 text-sm">{getOriginLabel(t.origin || 'system')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300 max-w-xs truncate">
                            {t.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-gray-400">
                            {formatCurrency(t.balanceBefore)}
                          </TableCell>
                          <TableCell className={`text-right font-mono font-bold ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-white font-bold">
                            {formatCurrency(t.balanceAfter)}
                          </TableCell>
                          <TableCell>
                            {activation ? (
                              <div className="flex flex-col">
                                <span className="text-white text-sm">#{activation.id}</span>
                                <span className="text-gray-400 text-xs">{service?.name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {new Date(t.createdAt).toLocaleString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      );
                    }))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {transactionsQuery.data && transactionsQuery.data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-400">
                    Página {page} de {transactionsQuery.data?.pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300"
                    >
                      Anterior
                    </Button>
                    <Button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= (transactionsQuery.data?.pagination.totalPages || 1)}
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nenhuma transação encontrada</p>
              <p className="text-gray-500 text-sm mt-1">Ajuste os filtros para ver resultados</p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}
