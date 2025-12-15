import { useState, useMemo, Fragment, useEffect } from 'react';
import DashboardLayoutWrapper from '@/components/DashboardLayoutWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { DollarSign, RefreshCw, Search, Calendar, CreditCard, ArrowLeftRight, Loader2, ChevronDown, ChevronUp, Wallet, TrendingDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import TableSkeleton from '@/components/TableSkeleton';

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 500);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 30;

  // Refund modal state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Query para calcular informações de saldo
  const { data: balanceInfo, isLoading: balanceInfoLoading } = trpc.payments.calculateRefundBalance.useQuery(
    {
      rechargeId: selectedPayment?.id || 0,
      amount: refundType === 'partial' && refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined,
    },
    {
      enabled: !!selectedPayment,
      refetchOnWindowFocus: false,
    }
  );

  // Atualizar query quando valor de devolução parcial mudar
  useEffect(() => {
    if (selectedPayment && refundType === 'partial' && refundAmount) {
      utils.payments.calculateRefundBalance.invalidate({
        rechargeId: selectedPayment.id,
        amount: Math.round(parseFloat(refundAmount) * 100),
      });
    }
  }, [refundAmount, refundType, selectedPayment, utils]);

  // Query para estatísticas
  const { data: stats, isLoading: statsLoading } = trpc.payments.getStats.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Query para pagamentos
  const { data: paymentsData, isLoading: paymentsLoading } = trpc.payments.getPayments.useQuery({
    searchTerm: debouncedSearchTerm.trim() || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit,
  });

  // Mutation para processar devolução
  const processRefundMutation = trpc.payments.processRefund.useMutation({
    onSuccess: (data) => {
      toast.success('Devolução processada com sucesso!', {
        description: data.message,
      });
      setRefundDialogOpen(false);
      setSelectedPayment(null);
      setRefundAmount('');
      setRefundReason('');
      utils.payments.getPayments.invalidate();
      utils.payments.getStats.invalidate();
    },
    onError: (error) => {
      toast.error('Erro ao processar devolução', {
        description: error.message,
      });
    },
  });

  const handleOpenRefundDialog = (payment: any) => {
    setSelectedPayment(payment);
    setRefundType('full');
    setRefundAmount((payment.amount / 100).toFixed(2));
    setRefundReason('');
    setRefundDialogOpen(true);
  };

  const handleProcessRefund = () => {
    if (!selectedPayment) return;

    const amountInCents = refundType === 'full' 
      ? selectedPayment.amount 
      : Math.round(parseFloat(refundAmount) * 100);

    processRefundMutation.mutate({
      rechargeId: selectedPayment.id,
      amount: refundType === 'full' ? undefined : amountInCents,
      reason: refundReason || undefined,
    });
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  return (
    <DashboardLayoutWrapper>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-8 h-8" style={{ color: '#1447e5' }} />
            Pagamentos
          </h1>
          <p className="text-gray-400 mt-2">
            Visualize e gerencie todos os pagamentos e devoluções
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Card: Total de Pagamentos Recebidos */}
          <Card className="border-neutral-800" style={{backgroundColor: '#0a0a0a'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pagamentos Recebidos</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.totalPayments || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Soma de todos os pagamentos concluídos
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card: Total de Devoluções via Pix */}
          <Card className="border-neutral-800" style={{backgroundColor: '#0a0a0a'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Devoluções</CardTitle>
              <RefreshCw className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.totalRefunds || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Soma de todas as devoluções realizadas
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card: Em Breve */}
          <Card className="border-neutral-800" style={{backgroundColor: '#0a0a0a'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em breve</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">-</div>
              <p className="text-xs text-muted-foreground mt-1">
                Novos dados disponíveis em breve
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Pagamentos com Filtros Integrados */}
        <Card className="border-neutral-800" style={{backgroundColor: '#0a0a0a'}}>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Lista de Pagamentos</CardTitle>
                <CardDescription>
                  {paymentsData?.total || 0} pagamento(s) encontrado(s)
                </CardDescription>
              </div>
              
              {/* Filtros na mesma linha do título */}
              <div className="flex items-center gap-2" style={{minWidth: '600px'}}>
                {/* Campo de busca - 50% */}
                <div className="relative" style={{flex: '0 0 50%'}}>
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="PIN, nome ou e-mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>

                {/* Data inicial - 15% */}
                <div style={{flex: '0 0 15%'}}>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Data inicial"
                  />
                </div>

                {/* Data final - 15% */}
                <div style={{flex: '0 0 15%'}}>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="Data final"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Botão de limpar filtros */}
            {(searchTerm || startDate || endDate) && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            )}

            <div className="rounded-md border border-neutral-800">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-neutral-800">
                    <TableHead>ID</TableHead>
                    <TableHead>ID Gerencianet</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsLoading ? (
                    <TableSkeleton rows={5} columns={10} />
                  ) : paymentsData?.payments && paymentsData.payments.length > 0 ? (
                    paymentsData.payments.map((payment) => (
                      <Fragment key={payment.id}>
                        <TableRow 
                          className="border-neutral-800 cursor-pointer hover:bg-neutral-900/30"
                          onClick={() => {
                            if (payment.hasRefund) {
                              setExpandedPaymentId(expandedPaymentId === payment.id ? null : payment.id);
                            }
                          }}
                        >
                          <TableCell className="font-mono text-sm">#{payment.id}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {payment.transactionId || payment.stripePaymentIntentId || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{payment.customerName || 'N/A'}</span>
                              <span className="text-xs text-muted-foreground">
                                PIN: {payment.customerPin || 'N/A'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {payment.paymentMethod === 'pix' ? (
                                <span className="text-green-500">Crédito</span>
                              ) : (
                                <span className="text-blue-500">Crédito</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="capitalize">{payment.paymentMethod === 'pix' ? 'Pix' : 'Cartão'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="flex flex-col text-xs">
                              {payment.paymentMethod === 'pix' && payment.endToEndId && (
                                <span className="text-muted-foreground truncate">
                                  E2E: {payment.endToEndId}
                                </span>
                              )}
                              {payment.paymentHash && (
                                <span className="text-muted-foreground truncate">
                                  Hash: {payment.paymentHash}
                                </span>
                              )}
                              {!payment.endToEndId && !payment.paymentHash && '-'}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(payment.completedAt || payment.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {payment.hasRefund ? (
                                <>
                                  <span className="text-green-500 font-medium">Devolvido</span>
                                  {expandedPaymentId === payment.id ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground">Não devolvido</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            {!payment.hasRefund && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenRefundDialog(payment)}
                              >
                                <ArrowLeftRight className="h-4 w-4 mr-1" />
                                Devolver
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                        {expandedPaymentId === payment.id && payment.hasRefund && (
                          <TableRow className="border-neutral-800 bg-neutral-900/20">
                            <TableCell colSpan={10} className="py-3">
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium">Observação:</span> Pagamento {payment.isFullRefund ? 'devolvido integralmente' : 'parcialmente devolvido'} no valor de{' '}
                                <span className="text-green-500 font-semibold">{formatCurrency(payment.refundAmount || 0)}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        Nenhum pagamento encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            {paymentsData && paymentsData.total > limit && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, paymentsData.total)} de {paymentsData.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * limit >= paymentsData.total}
                    onClick={() => setPage(page + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Processar Devolução */}
      {refundDialogOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 max-w-[500px] w-full mx-4 shadow-2xl">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="text-xl font-normal text-neutral-200">Processar Devolução</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Selecione o tipo de devolução e confirme a operação</p>
              </div>
              <button
                onClick={() => setRefundDialogOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {balanceInfoLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
              </div>
            ) : balanceInfo ? (
              <div className="space-y-4 mt-4">
                {/* Informações do Cliente */}
                <div className="bg-neutral-950/50 border border-neutral-800 rounded-lg p-3.5">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-neutral-400 text-xs mb-0.5">Cliente:</div>
                      <div className="text-white text-sm font-normal">{balanceInfo.customerName}</div>
                    </div>
                    <div>
                      <div className="text-neutral-400 text-xs mb-0.5">PIN:</div>
                      <div className="text-white text-sm font-normal">{balanceInfo.customerPin}</div>
                    </div>
                    <div>
                      <div className="text-neutral-400 text-xs mb-0.5">Valor Original:</div>
                      <div className="text-white text-sm font-normal">
                        {formatCurrency(balanceInfo.originalAmount)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cards de Saldo */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Saldo Atual */}
                  <div className="bg-emerald-950/30 border border-emerald-700/40 rounded-lg p-4">
                    <div className="flex items-center gap-1.5 text-emerald-400 mb-2">
                      <Wallet size={16} />
                      <span className="text-xs font-medium">Saldo Atual</span>
                    </div>
                    <div className="text-2xl font-light text-emerald-400">
                      {formatCurrency(balanceInfo.currentBalance)}
                    </div>
                  </div>

                  {/* Saldo Após Devolução */}
                  <div className="bg-amber-950/30 border border-amber-700/40 rounded-lg p-4">
                    <div className="flex items-center gap-1.5 text-amber-400 mb-2">
                      <TrendingDown size={16} />
                      <span className="text-xs font-medium">Saldo Após Devolução</span>
                    </div>
                    <div className="text-2xl font-light text-amber-400">
                      {formatCurrency(balanceInfo.balanceAfterRefund)}
                    </div>
                  </div>
                </div>

                {/* Tipo de Devolução */}
                <div>
                  <label className="block text-neutral-300 text-sm mb-2">Tipo de Devolução</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setRefundType('full');
                        setRefundAmount((selectedPayment.amount / 100).toFixed(2));
                      }}
                      className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                        refundType === 'full'
                          ? 'bg-blue-600 text-white'
                          : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800'
                      }`}
                    >
                      Integral
                    </button>
                    <button
                      onClick={() => setRefundType('partial')}
                      className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                        refundType === 'partial'
                          ? 'bg-blue-600 text-white'
                          : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800'
                      }`}
                    >
                      Parcial
                    </button>
                  </div>
                </div>

                {/* Valor da Devolução */}
                <div>
                  <label className="block text-neutral-300 text-sm mb-2">Valor da Devolução</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">R$</span>
                    <input
                      type="text"
                      value={refundAmount}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d.,]/g, '');
                        setRefundAmount(value);
                      }}
                      disabled={refundType === 'full'}
                      className="w-full bg-neutral-950/50 border border-neutral-800 rounded-lg pl-12 pr-3 py-2.5 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400">
                Erro ao carregar informações de saldo
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setRefundDialogOpen(false)}
                disabled={processRefundMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-neutral-800/50 hover:bg-neutral-800 text-white rounded-lg transition-colors text-sm font-medium border border-neutral-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessRefund}
                disabled={processRefundMutation.isPending || balanceInfoLoading || !balanceInfo || (refundType === 'partial' && !refundAmount)}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center"
              >
                {processRefundMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmar Devolução
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayoutWrapper>
  );
}
