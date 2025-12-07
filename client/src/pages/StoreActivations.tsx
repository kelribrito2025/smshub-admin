import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import StoreLayout from '../components/StoreLayout';
import { trpc } from '../lib/trpc';
import { Card } from '../components/ui/card';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, History } from 'lucide-react';
import TableSkeleton from '../components/TableSkeleton';


export default function StoreActivations() {
  const { customer } = useStoreAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const limit = 20;

  const historyQuery = trpc.store.getMyHistory.useQuery(
    { 
      customerId: customer?.id || 0,
      page: currentPage,
      limit,
    },
    { 
      enabled: !!customer?.id,
      refetchInterval: 30000,
    }
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  const formatPrice = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2)}`;
  };

  const toggleRow = (activationId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(activationId)) {
      newExpanded.delete(activationId);
    } else {
      newExpanded.add(activationId);
    }
    setExpandedRows(newExpanded);
  };

  const pagination = historyQuery.data?.pagination;
  const activations = historyQuery.data?.data || [];

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination && currentPage < pagination.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    if (!pagination) return [];
    
    const { totalPages } = pagination;
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

  const totalEntries = pagination?.total || 0;
  const startEntry = totalEntries > 0 ? (currentPage - 1) * limit + 1 : 0;
  const endEntry = Math.min(currentPage * limit, totalEntries);

  return (
    <StoreLayout>
      <div className="space-y-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-green-400 mb-2 flex items-center gap-2">
            <History className="w-6 h-6" />
            Histórico de Ativações
          </h1>
          <p className="text-green-600 text-sm">
            {totalEntries > 0 
              ? `Mostrando ${startEntry}-${endEntry} de ${totalEntries} entradas`
              : 'Nenhuma ativação encontrada'
            }
          </p>
        </div>

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
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Preço
                  </th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {historyQuery.isLoading ? (
                  <TableSkeleton rows={5} columns={5} />
                ) : activations.length > 0 ? (
                  <>
                    {activations.map((activation: any) => {
                      const smsMessages = activation.smsMessages || [];
                      const hasMultipleSms = smsMessages.length > 1;
                      const isExpanded = expandedRows.has(activation.id);
                      
                      return (
                        <React.Fragment key={activation.id}>
                          <tr className="border-b border-green-900/30 hover:bg-green-900/10 transition-colors">
                            <td className="px-3 md:px-6 py-3 md:py-4 text-green-400 font-mono text-xs md:text-sm">
                              {activation.service?.name || 'N/A'}
                            </td>
                            <td className="px-3 md:px-6 py-3 md:py-4 text-green-400 font-mono text-xs md:text-sm">
                              {activation.phoneNumber || 'Aguardando...'}
                            </td>
                            <td className="px-3 md:px-6 py-3 md:py-4 text-green-400 font-mono text-xs md:text-sm">
                              {hasMultipleSms ? (
                                <button
                                  onClick={() => toggleRow(activation.id)}
                                  className="flex items-center gap-2 px-3 py-2 bg-green-950/50 border border-green-500/50 rounded hover:bg-green-900/50 transition-colors"
                                >
                                  <span>{smsMessages.length} códigos recebidos</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              ) : smsMessages.length === 1 ? (
                                <span className="px-2 py-1 bg-green-950/50 border border-green-500/50 rounded">
                                  {smsMessages[0].code}
                                </span>
                              ) : activation.smsCode ? (
                                <span className="px-2 py-1 bg-green-950/50 border border-green-500/50 rounded">
                                  {activation.smsCode}
                                </span>
                              ) : (
                                <span className="text-green-600">-</span>
                              )}
                            </td>
                            <td className="px-3 md:px-6 py-3 md:py-4 text-green-400 font-mono text-xs md:text-sm">
                              {formatPrice(activation.sellingPrice)}
                            </td>
                            <td className="px-3 md:px-6 py-3 md:py-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${
                                activation.status === 'completed' ? 'bg-green-950/50 text-green-400 border border-green-500/50' :
                                activation.status === 'active' ? 'bg-blue-950/50 text-blue-400 border border-blue-500/50' :
                                activation.status === 'cancelled' ? 'bg-red-950/50 text-red-400 border border-red-500/50' :
                                activation.status === 'expired' ? 'bg-orange-950/50 text-orange-400 border border-orange-500/50' :
                                'bg-yellow-950/50 text-yellow-400 border border-yellow-500/50'
                              }`}>
                                {activation.status === 'expired' ? 'Expirado' : 
                                 activation.status === 'completed' ? 'Concluído' :
                                 activation.status === 'cancelled' ? 'Cancelado' :
                                 activation.status === 'active' ? 'Ativo' : activation.status}
                              </span>
                            </td>
                          </tr>
                          
                          {isExpanded && hasMultipleSms && (
                            <tr className="bg-green-950/20 border-b border-green-900/30">
                              <td colSpan={5} className="px-6 py-4">
                                <div className="space-y-2">
                                  <p className="text-green-400 font-bold text-sm mb-3">Histórico de SMS:</p>
                                  {smsMessages.map((sms: any, index: number) => (
                                    <div 
                                      key={sms.id} 
                                      className="flex items-center gap-4 px-4 py-2 bg-black/40 border border-green-500/30 rounded"
                                    >
                                      <span className="text-green-600 font-mono text-xs">#{index + 1}</span>
                                      <span className="text-green-400 font-mono text-sm flex-1">{sms.code}</span>
                                      <span className="text-green-600 text-xs">
                                        {formatDate(sms.receivedAt)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </>
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-green-600 font-mono">Nenhuma ativação encontrada</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            {/* Contador de entradas à esquerda */}
            <p className="text-sm text-green-600 font-mono">
              Mostrando {((currentPage - 1) * pagination.limit) + 1}-{Math.min(currentPage * pagination.limit, pagination.total)} de {pagination.total} entradas
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
                disabled={currentPage === pagination.totalPages}
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
