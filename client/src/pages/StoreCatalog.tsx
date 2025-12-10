import React from 'react';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import StoreLayout from '../components/StoreLayout';
import { trpc } from '../lib/trpc';
import { Card } from '../components/ui/card';
import { Activity, Clock, Copy, X, RefreshCw, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { copyToClipboard } from '../lib/clipboard';
import TableSkeleton from '../components/TableSkeleton';



export default function StoreCatalog() {
  const { customer } = useStoreAuth();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false); // Estado global de cancelamento
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10; // Número de itens por página

  const utils = trpc.useUtils();

  const activationsQuery = trpc.store.getMyActivations.useQuery(
    { customerId: customer?.id || 0 },
    { 
      enabled: !!customer?.id,
      retry: 1, // Apenas 1 retry para evitar 429
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // Consider data fresh for 30 seconds (updates via SSE in StoreLayout)
    }
  );

  const cancelMutation = trpc.store.cancelActivation.useMutation();

  const checkSmsMutation = trpc.store.checkSmsStatus.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate queries to refresh data
        utils.store.getMyActivations.invalidate();
      }
    },
  });

  const completeMutation = trpc.store.completeActivation.useMutation({
    onSuccess: () => {
      // Invalidate queries to refresh data
      utils.store.getMyActivations.invalidate();
    },
  });

  const requestNewSmsMutation = trpc.store.requestNewSms.useMutation({
    onSuccess: () => {
      // ⚠️ IMPORTANTE: NÃO invalidar query aqui para evitar notificação falsa
      // A query será atualizada automaticamente pelo polling a cada 6 segundos
      // Apenas mostrar feedback visual de que a solicitação foi enviada
      toast.info('🔄 Solicitação enviada', {
        description: 'Aguardando novo SMS da operadora...',
        duration: 3000,
      });
    },
  });

  const handleCopy = async (text: string, id: number) => {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper para calcular se pode cancelar (API 3 = 2 minutos)
  const canCancel = (activation: any) => {
    if (activation.apiId !== 3) return { allowed: true, remainingSeconds: 0 };
    
    const createdAt = new Date(activation.createdAt).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - createdAt) / (1000 * 60);
    
    if (elapsedMinutes >= 2) {
      return { allowed: true, remainingSeconds: 0 };
    }
    
    const remainingSeconds = Math.ceil((2 - elapsedMinutes) * 60);
    return { allowed: false, remainingSeconds };
  };

  const handleCancelActivation = async (activationId: number) => {
    if (!customer || isCancelling) return;
    
    // Ativar estado global de cancelamento
    setIsCancelling(true);
    
    // Executar cancelamento (sem notificação de loading, apenas sucesso)
    (async () => {
      try {
        // Executar cancelamento com delay mínimo de 5 segundos
        await Promise.all([
          cancelMutation.mutateAsync({
            activationId,
            customerId: customer.id,
          }),
          new Promise(resolve => setTimeout(resolve, 5000)) // Delay mínimo de 5 segundos
        ]);
        
        // Mostrar apenas notificação de SUCESSO quando realmente cancelado
        toast.success('Pedido cancelado com sucesso!');
        
        // Invalidate queries to refresh data
        await utils.store.getCustomer.invalidate();
        await utils.store.getMyActivations.invalidate();
      } catch (error: any) {
        // Mostrar notificação de ERRO (importante para o usuário)
        toast.error(error.message || 'Erro ao cancelar ativação');
        
        // Still invalidate on error to refresh state
        await utils.store.getCustomer.invalidate();
        await utils.store.getMyActivations.invalidate();
      } finally {
        // Desativar estado global de cancelamento após conclusão
        setIsCancelling(false);
      }
    })();
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const remaining = Math.max(0, 20 - diffMins);
    return `${remaining}min`;
  };

  const allActivations = activationsQuery.data || [];
  
  // Paginação
  const totalEntries = allActivations.length;
  const totalPages = Math.ceil(totalEntries / limit);
  const startIndex = (currentPage - 1) * limit;
  const endIndex = startIndex + limit;
  const activations = allActivations.slice(startIndex, endIndex);
  const startEntry = totalEntries > 0 ? startIndex + 1 : 0;
  const endEntry = Math.min(endIndex, totalEntries);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push(-1);
      }

      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push(-1);
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <StoreLayout>
      <div className="space-y-6">
        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-green-400 mb-2 flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Ativações em Andamentos
          </h1>
          <p className="text-green-600 text-sm">
            {totalEntries > 0 
              ? `Mostrando ${startEntry}-${endEntry} de ${totalEntries} entradas`
              : 'Nenhuma ativação encontrada'
            }
          </p>
        </div>

        {/* Activations Table */}
        <Card className="bg-black/50 border-green-900/50 overflow-hidden" style={{paddingTop: '0px', paddingBottom: '15px'}}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-green-900/50">
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Serviço
                  </th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    <span className="md:hidden">SMS</span>
                    <span className="hidden md:inline">Código SMS</span>
                  </th>
                  {/* Desktop: STATUS → REST → AÇÃO */}
                  <th className="hidden md:table-cell px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="hidden md:table-cell px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Rest
                  </th>
                  <th className="hidden md:table-cell px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Ação
                  </th>
                  {/* Mobile: AÇÃO → REST → STATUS */}
                  <th className="md:hidden px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Ação
                  </th>
                  <th className="md:hidden px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Rest
                  </th>
                  <th className="md:hidden px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {activationsQuery.isLoading ? (
                  <TableSkeleton rows={3} columns={6} />
                ) : activations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                        <p className="text-green-600 font-mono">Nenhuma ativação em andamento</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activations.map((activation: any) => (
                    <tr key={activation.id} className="border-b border-green-900/30 hover:bg-green-900/10 transition-colors">
                      <td className="px-3 md:px-6 py-3 md:py-4 text-green-400 font-mono text-xs md:text-sm">
                        {activation.service?.name || 'N/A'}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 font-mono text-xs md:text-sm">{activation.phoneNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(activation.phoneNumber, activation.id)}
                            onTouchEnd={(e) => {
                              e.preventDefault();
                              handleCopy(activation.phoneNumber, activation.id);
                            }}
                            className="text-green-600 hover:text-green-400 transition-colors cursor-pointer touch-manipulation"
                          >
                            {copiedId === activation.id ? (
                              <span className="text-xs">✓</span>
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        {activation.smsCode ? (
                          <div className="flex items-center gap-2">
                            {/* Mostrar mensagem de aguardando se smshubStatus === 'retry' */}
                            {activation.smshubStatus === 'retry' ? (
                              <span className="text-green-400 font-mono text-xs md:text-sm">Aguardando a chegada de um novo SMS...</span>
                            ) : (
                              <span className="text-green-400 font-mono text-base md:text-lg font-bold">{activation.smsCode}</span>
                            )}
                            {/* Só mostrar botão copiar se NÃO estiver aguardando */}
                            {activation.smshubStatus !== 'retry' && (
                              <button
                                type="button"
                                onClick={() => handleCopy(activation.smsCode, activation.id * 1000)}
                                onTouchEnd={(e) => {
                                  e.preventDefault();
                                  handleCopy(activation.smsCode, activation.id * 1000);
                                }}
                                className="text-green-600 hover:text-green-400 transition-colors cursor-pointer touch-manipulation"
                              >
                              {copiedId === activation.id * 1000 ? (
                                <span className="text-xs">✓</span>
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            {/* Mobile: apenas loader */}
                            <Loader2 className="w-4 h-4 text-green-600 animate-spin md:hidden" />
                            {/* Desktop: texto de instrução */}
                            <span className="hidden md:inline text-green-600 font-mono text-xs md:text-sm">
                              Envie o código para o número recebido.
                            </span>
                          </>
                        )}
                      </td>
                      
                      {/* Desktop: STATUS → REST → AÇÃO */}
                      <td className="hidden md:table-cell px-3 md:px-6 py-3 md:py-4">
                        <span className="px-2 md:px-3 py-1 bg-green-900/30 border border-green-500/50 rounded text-green-400 text-xs font-mono uppercase">
                          {activation.status}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-1 md:gap-2 text-green-400 font-mono text-xs md:text-sm">
                          <Clock className="w-3 h-3 md:w-4 md:h-4" />
                          {formatTime(activation.createdAt)}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-2">
                          {/* Antes do SMS: Apenas botão Cancelar (polling automático já verifica) */}
                          {/* Só mostrar Cancelar se NUNCA teve SMS (smshubStatus === null) */}
                          {!activation.smsCode && !activation.smshubStatus && (() => {
                            const { allowed, remainingSeconds } = canCancel(activation);
                            return (
                            <Button
                              onClick={() => {
                                if (!allowed) {
                                  toast.error(`Nesta opção, os pedidos só podem ser cancelados após 2 minutos. Aguarde ${remainingSeconds} segundos.`);
                                  return;
                                }
                                handleCancelActivation(activation.id);
                              }}
                              variant="outline"
                              size="sm"
                              className="border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300 hover:border-red-500/50 text-xs md:text-sm px-2 md:px-3"
                              disabled={isCancelling || !allowed}
                              title={!allowed ? `Aguarde ${remainingSeconds} segundos` : ''}
                            >
                              {isCancelling ? (
                                <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin md:mr-1" />
                              ) : (
                                <X className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                              )}
                              <span className="hidden md:inline">Cancelar</span>
                            </Button>
                            );
                          })()}
                          {activation.smshubStatus && (
                            <>
                              <Button
                                onClick={() => {
                                  if (!customer) return;
                                  completeMutation.mutate({
                                    activationId: activation.id,
                                    customerId: customer.id,
                                  });
                                }}
                                variant="outline"
                                size="sm"
                                disabled={completeMutation.isPending}
                                className="bg-green-900/30 border-green-500/50 text-green-400 hover:bg-green-900/50 hover:text-green-300 transition-colors text-xs md:text-sm px-2 md:px-3"
                              >
                                <Check className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                                <span className="hidden md:inline">Concluir</span>
                              </Button>
                              {activation.smsCode && activation.smshubStatus !== 'retry' && (
                                <Button
                                  onClick={() => {
                                    if (!customer) return;
                                    requestNewSmsMutation.mutate({
                                      activationId: activation.id,
                                      customerId: customer.id,
                                    });
                                  }}
                                  variant="outline"
                                  size="sm"
                                  disabled={requestNewSmsMutation.isPending}
                                  className="bg-blue-900/30 border-blue-500/50 text-blue-400 hover:bg-blue-900/50 hover:text-blue-300 transition-colors text-xs md:text-sm px-2 md:px-3"
                                  title="Solicitar novo SMS"
                                >
                                  <RefreshCw className={`w-3 h-3 md:w-4 md:h-4 ${requestNewSmsMutation.isPending ? 'animate-spin' : ''} md:mr-1`} />
                                  <span className="hidden md:inline">Atualizar</span>
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      
                      {/* Mobile: AÇÃO → REST → STATUS */}
                      <td className="md:hidden px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-2">
                          {!activation.smsCode && !activation.smshubStatus && (() => {
                            const { allowed, remainingSeconds } = canCancel(activation);
                            return (
                            <Button
                              onClick={() => {
                                if (!allowed) {
                                  toast.error(`Nesta opção, os pedidos só podem ser cancelados após 2 minutos. Aguarde ${remainingSeconds} segundos.`);
                                  return;
                                }
                                handleCancelActivation(activation.id);
                              }}
                              variant="outline"
                              size="sm"
                              className="border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300 hover:border-red-500/50 text-xs md:text-sm px-2 md:px-3"
                              disabled={isCancelling || !allowed}
                              title={!allowed ? `Aguarde ${remainingSeconds} segundos` : ''}
                            >
                              {isCancelling ? (
                                <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin md:mr-1" />
                              ) : (
                                <X className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                              )}
                              <span className="hidden md:inline">Cancelar</span>
                            </Button>
                            );
                          })()}
                          {activation.smshubStatus && (
                            <>
                              <Button
                                onClick={() => {
                                  if (!customer) return;
                                  completeMutation.mutate({
                                    activationId: activation.id,
                                    customerId: customer.id,
                                  });
                                }}
                                variant="outline"
                                size="sm"
                                disabled={completeMutation.isPending}
                                className="bg-green-900/30 border-green-500/50 text-green-400 hover:bg-green-900/50 hover:text-green-300 transition-colors text-xs md:text-sm px-2 md:px-3"
                              >
                                <Check className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                                <span className="hidden md:inline">Concluir</span>
                              </Button>
                              {activation.smsCode && activation.smshubStatus !== 'retry' && (
                                <Button
                                  onClick={() => {
                                    if (!customer) return;
                                    requestNewSmsMutation.mutate({
                                      activationId: activation.id,
                                      customerId: customer.id,
                                    });
                                  }}
                                  variant="outline"
                                  size="sm"
                                  disabled={requestNewSmsMutation.isPending}
                                  className="bg-blue-900/30 border-blue-500/50 text-blue-400 hover:bg-blue-900/50 hover:text-blue-300 transition-colors text-xs md:text-sm px-2 md:px-3"
                                  title="Solicitar novo SMS"
                                >
                                  <RefreshCw className={`w-3 h-3 md:w-4 md:h-4 ${requestNewSmsMutation.isPending ? 'animate-spin' : ''} md:mr-1`} />
                                  <span className="hidden md:inline">Atualizar</span>
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="md:hidden px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-1 md:gap-2 text-green-400 font-mono text-xs md:text-sm">
                          <Clock className="w-3 h-3 md:w-4 md:h-4" />
                          {formatTime(activation.createdAt)}
                        </div>
                      </td>
                      <td className="md:hidden px-3 md:px-6 py-3 md:py-4">
                        <span className="px-2 md:px-3 py-1 bg-green-900/30 border border-green-500/50 rounded text-green-400 text-xs font-mono uppercase">
                          {activation.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            {/* Contador de entradas à esquerda */}
            <p className="text-sm text-green-600 font-mono">
              Mostrando {startEntry}-{endEntry} de {totalEntries} entradas
            </p>

            {/* Controles de paginação à direita */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-green-950/50 border border-green-500/50 rounded text-green-400 hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono text-sm"
              >
                Anterior
              </button>

              {getPageNumbers().map((page, index) => {
                if (page === -1) {
                  return (
                    <span key={`ellipsis-${index}`} className="px-2 text-green-600">
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={page}
                    onClick={() => handlePageClick(page)}
                    className={`px-4 py-2 rounded font-mono transition-colors ${
                      currentPage === page
                        ? 'bg-green-500 text-black font-bold'
                        : 'bg-green-950/50 border border-green-500/50 text-green-400 hover:bg-green-900/50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-green-950/50 border border-green-500/50 rounded text-green-400 hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono text-sm"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
