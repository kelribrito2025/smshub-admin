import React from "react";
import DashboardLayoutWrapper from "@/components/DashboardLayoutWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { DollarSign, Edit, Loader2, Plus, Search, Trash2, Users, Wallet, TrendingUp, ChevronDown, ChevronUp, ArrowDownCircle, ArrowUpCircle, ShoppingCart, RefreshCw, Activity, User, Shield, Settings, Gift, X, CheckCircle2, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { toast } from "sonner";
import { CustomerDialog } from "@/components/CustomerDialog";
import { BalanceSidePanel } from "@/components/BalanceSidePanel";
import { ConfirmationModal } from "@/components/ConfirmationModal";

import { format } from "date-fns";

export default function Customers() {
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [balanceCustomer, setBalanceCustomer] = useState<any>(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);
  const [transactionPage, setTransactionPage] = useState(1);
  const transactionLimit = 25;
  const [refundModal, setRefundModal] = useState<{ show: boolean; transaction: any | null; customerId: number | null; isRefunded: boolean }>({ show: false, transaction: null, customerId: null, isRefunded: false });
  const [hoveredGroupKey, setHoveredGroupKey] = useState<string | null>(null);
  const [impersonateModal, setImpersonateModal] = useState<{ show: boolean; customerId: number | null; customerName: string }>({ show: false, customerId: null, customerName: '' });


  const { data: customers, isLoading } = trpc.customers.getAll.useQuery();
  const { data: stats } = trpc.customers.getStats.useQuery();

  // Query para transações do cliente expandido
  const transactionsQuery = trpc.audit.getTransactions.useQuery(
    {
      customerId: expandedCustomerId || undefined,
      page: transactionPage,
      limit: transactionLimit,
    },
    {
      enabled: expandedCustomerId !== null,
      staleTime: 30000,
    }
  );

  const toggleActiveMutation = trpc.customers.toggleActive.useMutation({
    onSuccess: (data) => {
      toast.success(data.active ? "Cliente ativado" : "Cliente desativado");
      utils.customers.getAll.invalidate();
      utils.customers.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteCustomerMutation = trpc.customers.delete.useMutation({
    onSuccess: () => {
      toast.success("Cliente excluído com sucesso!");
      utils.customers.getAll.invalidate();
      utils.customers.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const refundPurchaseMutation = trpc.customers.refundPurchase.useMutation({
    onSuccess: (data) => {
      toast.success(`Reembolso de ${formatCurrency(data.refundAmount * 100)} realizado com sucesso!`);
      // Invalidate transactions to show the new refund
      utils.audit.getTransactions.invalidate();
      utils.customers.getAll.invalidate();
      closeRefundModal();
    },
    onError: (error) => {
      toast.error(`Erro ao processar reembolso: ${error.message}`);
    },
  });

  const impersonateMutation = trpc.impersonation.generateToken.useMutation({
    onSuccess: (data) => {
      // Open new tab with impersonation URL
      const impersonationUrl = `${import.meta.env.VITE_FRONTEND_URL}/impersonate?token=${data.token}`;
      window.open(impersonationUrl, '_blank');
      toast.success(`Acessando como ${data.customerName}...`);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar token: ${error.message}`);
    },
  });

  const filteredCustomers = customers?.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.id.toString().includes(searchTerm) ||
      customer.pin?.toString().includes(searchTerm)
  );

  // Pagination calculations
  const totalItems = filteredCustomers?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCustomers = filteredCustomers?.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDelete = (customer: any) => {
    if (confirm(`Tem certeza que deseja excluir o cliente ${customer.name}?`)) {
      deleteCustomerMutation.mutate({ id: customer.id });
    }
  };

  const handleImpersonate = (customerId: number, customerName: string) => {
    setImpersonateModal({ show: true, customerId, customerName });
  };

  const confirmImpersonate = () => {
    if (impersonateModal.customerId) {
      impersonateMutation.mutate({ customerId: impersonateModal.customerId });
    }
  };

  const handleRowClick = (customerId: number) => {
    // Só permite expansão se houver termo de busca ativo
    if (!searchTerm.trim()) {
      toast.info('Use a busca para filtrar um cliente específico antes de ver o histórico');
      return;
    }

    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null);
      setTransactionPage(1);
    } else {
      setExpandedCustomerId(customerId);
      setTransactionPage(1);
    }
  };

  const openRefundModal = (transaction: any, customerId: number) => {
    // Check if this purchase has already been refunded
    const isRefunded = transactionsQuery.data?.data.some(
      (row) => row.transaction.type === 'refund' && row.transaction.relatedActivationId === transaction.relatedActivationId
    ) || false;
    
    setRefundModal({ show: true, transaction, customerId, isRefunded });
  };

  const closeRefundModal = () => {
    setRefundModal({ show: false, transaction: null, customerId: null, isRefunded: false });
  };

  const confirmRefund = () => {
    if (!refundModal.transaction || !refundModal.customerId) return;
    
    refundPurchaseMutation.mutate({
      transactionId: refundModal.transaction.id,
      customerId: refundModal.customerId,
    });
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

  // Verifica se a transação é um bônus de afiliado
  const isAffiliateBonus = (transaction: any) => {
    if (transaction.type !== 'credit' || transaction.origin !== 'system') return false;
    try {
      const metadata = transaction.metadata ? JSON.parse(transaction.metadata) : null;
      return metadata && metadata.referralId && metadata.bonusAmount;
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayoutWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayoutWrapper>
    );
  }

  return (
    <DashboardLayoutWrapper>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-500" />
              Clientes
            </h1>
            <p className="text-gray-400 mt-2">
              Gerencie os clientes do painel de vendas
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Cliente
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total de Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardTitle className="text-sm font-medium flex items-center gap-2 cursor-help">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      Clientes Ativos (30d)
                    </CardTitle>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clientes que realizaram pelo menos uma compra nos últimos 30 dias</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {stats?.activeCustomersLast30Days || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Saldo Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {(stats?.totalBalance || 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Saldo Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {(stats?.averageBalance || 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Clientes</CardTitle>
                <CardDescription>
                  Gerencie cadastros, saldos e status dos clientes
                </CardDescription>
              </div>

            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por PIN, ID, nome ou email..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>PIN</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers && paginatedCustomers.length > 0 ? (
                    paginatedCustomers.map((customer) => (
                      <React.Fragment key={customer.id}>
                        <TableRow 
                          className={`${searchTerm.trim() ? 'cursor-pointer hover:bg-gray-800/50' : ''} ${customer.banned ? "bg-red-950/40 border-2 border-red-500/50 animate-pulse" : ""} ${expandedCustomerId === customer.id ? "bg-gray-800/30" : ""}`}
                          onClick={() => handleRowClick(customer.id)}
                        >
                          <TableCell>
                            {searchTerm.trim() && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0 h-8 w-8"
                              >
                                {expandedCustomerId === customer.id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`font-mono font-bold ${customer.banned ? "border-red-500 text-red-400" : ""}`}>
                              #{customer.pin}
                            </Badge>
                          </TableCell>
                        <TableCell className={`font-medium ${customer.banned ? "text-red-400" : "text-muted-foreground"}`}>{customer.id}</TableCell>
                        <TableCell className={`font-semibold ${customer.banned ? "text-red-300" : ""}`}>{customer.name}</TableCell>
                        <TableCell className={`${customer.banned ? "text-red-400" : "text-muted-foreground"}`}>{customer.email}</TableCell>
                        <TableCell>
                          <span className={`font-mono ${customer.banned ? "text-red-400" : ""}`}>
                            R$ {(customer.balance / 100).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={customer.active}
                            onCheckedChange={() =>
                              toggleActiveMutation.mutate({ id: customer.id })
                            }
                            disabled={toggleActiveMutation.isPending}
                          />
                        </TableCell>
                        <TableCell className={`${customer.banned ? "text-red-400" : "text-muted-foreground"}`}>
                          {format(new Date(customer.createdAt), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImpersonate(customer.id, customer.name);
                              }}
                              title="Logar como cliente (Suporte)"
                              className="text-blue-500 hover:text-blue-400"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBalanceCustomer(customer);
                              }}
                              title="Gerenciar saldo"
                            >
                              <Wallet className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditCustomer(customer);
                              }}
                              title="Editar cliente"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(customer);
                              }}
                              title="Excluir cliente"
                              disabled={deleteCustomerMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Timeline Expandida - só aparece se houver busca ativa */}
                      {searchTerm.trim() && expandedCustomerId === customer.id && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-gray-900/50 p-0">
                            <div className="p-6 space-y-4">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                  <Activity className="w-5 h-5 text-blue-500" />
                                  Timeline de Transações - {customer.name}
                                </h3>
                                <p className="text-sm text-gray-400">
                                  {transactionsQuery.data
                                    ? `Mostrando ${transactionsQuery.data.data.length} de ${transactionsQuery.data.pagination.total} transações`
                                    : 'Carregando...'}
                                </p>
                              </div>

                              {transactionsQuery.isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                              ) : transactionsQuery.data && transactionsQuery.data.data.length > 0 ? (
                                <>
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="border-gray-700 hover:bg-gray-800/50">
                                          <TableHead className="text-gray-400">ID</TableHead>
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
                                        {(() => {
                                          // Criar mapa de relacionamento entre compras e reembolsos
                                          const purchaseByActivationId = new Map<number, any>();
                                          const refundByActivationId = new Map<number, any>();

                                          transactionsQuery.data.data.forEach((row) => {
                                            const t = row.transaction;
                                            if (t.type === 'purchase' && t.relatedActivationId) {
                                              purchaseByActivationId.set(t.relatedActivationId, t);
                                            } else if (t.type === 'refund' && t.relatedActivationId) {
                                              refundByActivationId.set(t.relatedActivationId, t);
                                            }
                                          });

                                          return transactionsQuery.data.data.map((row) => {
                                            const t = row.transaction;
                                            const activation = row.activation;
                                            const service = row.service;

                                            const isBonus = isAffiliateBonus(t);
                                            const isPurchase = t.type === 'purchase';
                                            const isRefund = t.type === 'refund';

                                            // Determinar groupKey (activationId para relacionamento)
                                            const groupKey = t.relatedActivationId ? `activation-${t.relatedActivationId}` : null;

                                            // Verificar se há transação relacionada na lista atual
                                            const hasRelatedTransaction = groupKey && (
                                              (isPurchase && refundByActivationId.has(t.relatedActivationId!)) ||
                                              (isRefund && purchaseByActivationId.has(t.relatedActivationId!))
                                            );

                                            // Aplicar highlight se hover está ativo e groupKey corresponde
                                            const isHighlighted = groupKey && hoveredGroupKey === groupKey;

                                            return (
                                              <TableRow 
                                                key={t.id} 
                                                className={`border-gray-700 transition-all duration-200 ${
                                                  isPurchase ? 'cursor-pointer' : ''
                                                } ${
                                                  isHighlighted 
                                                    ? 'bg-emerald-500/10 border-l-2 border-l-emerald-400 hover:bg-emerald-500/15' 
                                                    : 'hover:bg-gray-800/30'
                                                }`}
                                                onClick={() => {
                                                  if (isPurchase && expandedCustomerId) {
                                                    openRefundModal(t, expandedCustomerId);
                                                  }
                                                }}
                                                onMouseEnter={() => {
                                                  if (hasRelatedTransaction && groupKey) {
                                                    setHoveredGroupKey(groupKey);
                                                  }
                                                }}
                                                onMouseLeave={() => {
                                                  setHoveredGroupKey(null);
                                                }}
                                            >
                                              <TableCell className="font-mono text-gray-400 text-sm">#{t.id}</TableCell>
                                              <TableCell>
                                                <div className="flex items-center gap-2">
                                                  {isBonus ? (
                                                    <Gift className="w-5 h-5 text-purple-500" />
                                                  ) : (
                                                    getTypeIcon(t.type)
                                                  )}
                                                  <span className="text-white">
                                                    {isBonus ? 'Bônus' : getTypeLabel(t.type)}
                                                  </span>
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
                                          });
                                        })()}
                                      </TableBody>
                                    </Table>
                                  </div>

                                  {/* Paginação da Timeline */}
                                  {transactionsQuery.data.pagination.totalPages > 1 && (
                                    <div className="flex items-center justify-between mt-4">
                                      <div className="text-sm text-gray-400">
                                        Página {transactionPage} de {transactionsQuery.data.pagination.totalPages}
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setTransactionPage(p => Math.max(1, p - 1));
                                          }}
                                          disabled={transactionPage === 1}
                                          variant="outline"
                                          size="sm"
                                          className="border-gray-600 text-gray-300"
                                        >
                                          Anterior
                                        </Button>
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setTransactionPage(p => p + 1);
                                          }}
                                          disabled={transactionPage >= transactionsQuery.data.pagination.totalPages}
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
                                  <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                  <p className="text-gray-400">Nenhuma transação encontrada</p>
                                  <p className="text-gray-500 text-sm mt-1">Este cliente ainda não possui histórico de transações</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      </React.Fragment>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {searchTerm
                          ? "Nenhum cliente encontrado"
                          : "Nenhum cliente cadastrado ainda"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-black/50 border border-border rounded-lg">
            <div className="text-sm text-gray-400">
              Página {currentPage} de {totalPages} • Total: {totalItems} clientes
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                Primeira
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <div className="flex items-center gap-2 px-3">
                <span className="text-sm text-gray-400">Página</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-16 text-center bg-black/30 border-border text-white"
                />
                <span className="text-sm text-gray-400">de {totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Última
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Dialog */}
      <CustomerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        customer={null}
        onSuccess={() => {
          utils.customers.getAll.invalidate();
          utils.customers.getStats.invalidate();
        }}
      />

      {/* Edit Customer Dialog */}
      <CustomerDialog
        open={!!editCustomer}
        onOpenChange={(open: boolean) => !open && setEditCustomer(null)}
        customer={editCustomer}
        onSuccess={() => {
          setEditCustomer(null);
          utils.customers.getAll.invalidate();
          utils.customers.getStats.invalidate();
        }}
      />

      {/* Balance Dialog */}
      <BalanceSidePanel
        open={!!balanceCustomer}
        onOpenChange={(open: boolean) => !open && setBalanceCustomer(null)}
        customer={balanceCustomer}
        onSuccess={() => {
          setBalanceCustomer(null);
          utils.customers.getAll.invalidate();
          utils.customers.getStats.invalidate();
        }}
      />

      {/* Modal de Reembolso */}
      {refundModal.show && refundModal.transaction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  refundModal.isRefunded ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                }`}>
                  {refundModal.isRefunded ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : (
                    <RefreshCw size={20} className="text-amber-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">
                    {refundModal.isRefunded ? 'Reembolso Realizado' : 'Confirmar Reembolso'}
                  </h3>
                  <p className="text-xs text-neutral-500">Transação #{refundModal.transaction.id}</p>
                </div>
              </div>
              <button
                onClick={closeRefundModal}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-neutral-950/50 border border-neutral-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Descrição:</span>
                  <span className="text-white text-right">{refundModal.transaction.description}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">{refundModal.isRefunded ? 'Valor Reembolsado:' : 'Valor:'}</span>
                  <span className={`font-medium ${
                    refundModal.isRefunded ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(Math.abs(refundModal.transaction.amount))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Data da Compra:</span>
                  <span className="text-white">{new Date(refundModal.transaction.createdAt).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {refundModal.isRefunded ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <p className="text-sm text-emerald-400">
                    O reembolso foi processado com sucesso e o valor foi devolvido ao saldo do cliente.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-neutral-400">
                  Deseja realmente realizar o reembolso desta transação? O valor será devolvido ao saldo do cliente.
                </p>
              )}
            </div>

            {refundModal.isRefunded ? (
              <button
                onClick={closeRefundModal}
                className="w-full px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Fechar
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={closeRefundModal}
                  disabled={refundPurchaseMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmRefund}
                  disabled={refundPurchaseMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {refundPurchaseMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Reembolso'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Impersonation */}
      <ConfirmationModal
        isOpen={impersonateModal.show}
        onClose={() => setImpersonateModal({ show: false, customerId: null, customerName: '' })}
        onConfirm={confirmImpersonate}
        title="Acesso a Conta do Cliente"
        message="Você está prestes a acessar a conta deste cliente. Esta ação será registrada em auditoria. Continuar?"
        confirmText="Continuar"
        cancelText="Cancelar"
        accentColor="orange"
        customerId={impersonateModal.customerId?.toString()}
        customerName={impersonateModal.customerName}
      />

    </DashboardLayoutWrapper>
  );
}
