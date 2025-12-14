import { useState, useMemo } from 'react';
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
import { DollarSign, RefreshCw, Search, Calendar, CreditCard, ArrowLeftRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import TableSkeleton from '@/components/TableSkeleton';

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 500);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  // Refund modal state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const utils = trpc.useUtils();

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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pagamentos</h1>
          <p className="text-muted-foreground">
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

        {/* Filtros */}
        <Card className="border-neutral-800" style={{backgroundColor: '#0a0a0a'}}>
          <CardHeader>
            <CardTitle>Filtros de Busca</CardTitle>
            <CardDescription>Busque por PIN, nome ou e-mail do cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Campo de busca */}
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="PIN, nome ou e-mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Data inicial */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* Data final */}
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Botão de limpar filtros */}
            {(searchTerm || startDate || endDate) && (
              <div className="mt-4">
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
          </CardContent>
        </Card>

        {/* Tabela de Pagamentos */}
        <Card className="border-neutral-800" style={{backgroundColor: '#0a0a0a'}}>
          <CardHeader>
            <CardTitle>Lista de Pagamentos</CardTitle>
            <CardDescription>
              {paymentsData?.total || 0} pagamento(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <TableSkeleton />
            ) : (
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
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsData?.payments && paymentsData.payments.length > 0 ? (
                      paymentsData.payments.map((payment) => (
                        <TableRow key={payment.id} className="border-neutral-800">
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
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenRefundDialog(payment)}
                            >
                              <ArrowLeftRight className="h-4 w-4 mr-1" />
                              Devolver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          Nenhum pagamento encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

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

          {selectedPayment && (
            <div className="space-y-4">
              {/* Informações do pagamento */}
              <div className="rounded-lg border border-neutral-800 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cliente:</span>
                  <span className="text-sm font-medium">{selectedPayment.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">PIN:</span>
                  <span className="text-sm font-medium">{selectedPayment.customerPin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valor Original:</span>
                  <span className="text-sm font-medium">{formatCurrency(selectedPayment.amount)}</span>
                </div>
              </div>

              {/* Tipo de devolução */}
              <div className="space-y-2">
                <Label>Tipo de Devolução</Label>
                <div className="flex gap-2">
                  <Button
                    variant={refundType === 'full' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setRefundType('full');
                      setRefundAmount((selectedPayment.amount / 100).toFixed(2));
                    }}
                  >
                    Integral
                  </Button>
                  <Button
                    variant={refundType === 'partial' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRefundType('partial')}
                  >
                    Parcial
                  </Button>
                </div>
              </div>

              {/* Valor da devolução (se parcial) */}
              {refundType === 'partial' && (
                <div className="space-y-2">
                  <Label htmlFor="refundAmount">Valor da Devolução (R$)</Label>
                  <Input
                    id="refundAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={(selectedPayment.amount / 100).toFixed(2)}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}

              {/* Motivo da devolução */}
              <div className="space-y-2">
                <Label htmlFor="refundReason">Motivo (opcional)</Label>
                <Input
                  id="refundReason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Ex: Solicitação do cliente"
                />
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
