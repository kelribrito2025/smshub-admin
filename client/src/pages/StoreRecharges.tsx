import React, { useState } from 'react';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import StoreLayout from '../components/StoreLayout';
import { trpc } from '../lib/trpc';
import { Card } from '../components/ui/card';
import { CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import TableSkeleton from '../components/TableSkeleton';




export default function StoreRecharges() {
  const { customer } = useStoreAuth();
  const [currentPage, setCurrentPage] = useState(1);

  const limit = 20;

  const rechargesQuery = trpc.recharges.getMyRecharges.useQuery(
    {
      customerId: customer?.id || 0,
      page: currentPage,
      limit,

    },
    {
      enabled: !!customer?.id,
    }
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (amount: number) => {
    // Amount is already in cents in the database, so we divide by 100
    return `R$ ${(amount / 100).toFixed(2)}`;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      pix: 'PIX',
      card: 'Cartão',
      crypto: 'Cripto',
      picpay: 'PicPay',
    };
    return labels[method] || method;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      completed: {
        label: 'Concluído',
        className: 'bg-green-950/50 text-green-400 border border-green-500/50',
      },
      pending: {
        label: 'Pendente',
        className: 'bg-yellow-950/50 text-yellow-400 border border-yellow-500/50',
      },
      expired: {
        label: 'Expirado',
        className: 'bg-red-950/50 text-red-400 border border-red-500/50',
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const pagination = rechargesQuery.data?.pagination;
  const recharges = rechargesQuery.data?.data || [];

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
            <CreditCard className="w-6 h-6" />
            Histórico de Recargas
          </h1>
          <p className="text-green-600 text-sm">
            {totalEntries > 0
              ? `Mostrando ${startEntry}-${endEntry} de ${totalEntries} entradas`
              : 'Nenhuma recarga encontrada'}
          </p>
        </div>



        <Card className="bg-black/50 border-green-900/50 overflow-hidden" style={{paddingTop: '0px', paddingBottom: '15px'}}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-green-900/50">
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Horário
                  </th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-green-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rechargesQuery.isLoading ? (
                  <TableSkeleton rows={5} columns={5} />
                ) : recharges.length > 0 ? (
                  recharges.map((recharge: any) => (
                    <tr key={recharge.id} className="border-b border-green-900/30 hover:bg-green-900/10 transition-colors">
                      <td className="px-3 md:px-6 py-3 md:py-4 text-green-400 font-mono text-xs md:text-sm">
                        {getPaymentMethodLabel(recharge.paymentMethod)}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-green-400 font-mono text-xs md:text-sm">
                        {formatDate(recharge.createdAt)}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-green-400 font-mono text-xs md:text-sm">
                        {formatTime(recharge.createdAt)}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-green-400 font-mono text-xs md:text-sm font-semibold">
                        {formatPrice(recharge.amount)}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        {getStatusBadge(recharge.status)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-green-600 font-mono">Nenhuma recarga encontrada</p>
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
