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
import { DollarSign, RefreshCw, Search, Calendar, CreditCard, ArrowLeftRight, Loader2, ChevronDown, ChevronUp, Wallet, TrendingDown } from 'lucide-react';
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
  const { data: balanceInfo } = trpc.payments.calculateRefundBalance.useQuery(
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

      {/* Modal de Devolução */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Processar Devolução</DialogTitle>
            <DialogDescription>
              Selecione o tipo de devolução e confirme a operação
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && balanceInfo && (
            <div className="space-y-4">
              {/* Informações do pagamento */}
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/20 p-4 grid grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Cliente:</span>
                  <p className="text-sm font-semibold">{balanceInfo.customerName}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">PIN:</span>
                  <p className="text-sm font-semibold">{balanceInfo.customerPin}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Valor Original:</span>
                  <p className="text-sm font-semibold">{formatCurrency(balanceInfo.originalAmount)}</p>
                </div>
              </div>

              {/* Cards de Saldo */}
              <div className="grid grid-cols-2 gap-4">
                {/* Saldo Atual */}
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-5 w-5 text-blue-500" />
                    <span className="text-xs text-blue-400 font-medium">Saldo Atual</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-500">
                    {formatCurrency(balanceInfo.currentBalance)}
                  </p>
                </div>

                {/* Saldo Após Devolução */}
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-5 w-5 text-yellow-500" />
                    <span className="text-xs text-yellow-400 font-medium">Saldo Após Devolução</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-500">
                    {formatCurrency(balanceInfo.balanceAfterRefund)}
                  </p>
                </div>
              </div>

              {/* Tipo de devolução */}
              <div className="space-y-2">
                <Label>Tipo de Devolução</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={refundType === 'full' ? 'default' : 'outline'}
                    className={refundType === 'full' ? '' : 'bg-transparent'}
                    onClick={() => {
                      setRefundType('full');
                      setRefundAmount((selectedPayment.amount / 100).toFixed(2));
                    }}
                  >
                    Integral
                  </Button>
                  <Button
                    variant={refundType === 'partial' ? 'default' : 'outline'}
                    className={refundType === 'partial' ? '' : 'bg-transparent'}
                    onClick={() => setRefundType('partial')}
                  >
                    Parcial
                  </Button>
                </div>
              </div>

              {/* Valor da devolução */}
              <div className="space-y-2">
                <Label htmlFor="refundAmount">Valor da Devolução</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="refundAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={(selectedPayment.amount / 100).toFixed(2)}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="0,00"
                    className="pl-10 bg-neutral-900/50"
                    disabled={refundType === 'full'}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundDialogOpen(false)}
              disabled={processRefundMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleProcessRefund}
              disabled={processRefundMutation.isPending || (refundType === 'partial' && !refundAmount)}
            >
              {processRefundMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar Devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayoutWrapper>
  );
}
