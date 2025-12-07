import React, { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Loader2, Star } from 'lucide-react';
import { SimpleTooltip } from './SimpleTooltip';
import { Star as StarIcon } from 'lucide-react';

interface ServiceApiOptionsProps {
  serviceId: number;
  countryId: number;
  customerId?: number; // ID do cliente para verificar se é primeira compra
  onBuy: (apiId: number, apiName: string, price: number) => void;
  loadingApiId?: number | null;
  isPurchasing?: boolean;
  isLocked?: boolean;
}

export default function ServiceApiOptions({ serviceId, countryId, customerId, onBuy, loadingApiId, isPurchasing, isLocked }: ServiceApiOptionsProps) {
  // Estado para controlar tooltip aberto no mobile
  const [openTooltipId, setOpenTooltipId] = useState<number | null>(null);
  
  // ✅ OTIMIZAÇÃO: Habilitar cache de 2 minutos e reduzir refetch agressivo
  const optionsQuery = trpc.store.getServiceApiOptions.useQuery(
    {
      serviceId,
      countryId,
    },
    {
      staleTime: 2 * 60 * 1000, // Cache de 2 minutos (dados de preços não mudam frequentemente)
      gcTime: 5 * 60 * 1000, // Manter em memória por 5 minutos
      refetchOnMount: false, // Não recarregar automaticamente ao montar
      refetchOnWindowFocus: false, // Não recarregar ao focar janela
      refetchOnReconnect: false, // Não recarregar ao reconectar
    }
  );

  // Buscar recomendação de fornecedor
  const recommendationQuery = trpc.store.getRecommendedSupplier.useQuery(
    {
      serviceId,
      availableApiIds: [1, 2, 3],
    },
    {
      enabled: !!serviceId,
      staleTime: 5 * 60 * 1000, // Cache de 5 minutos
    }
  );

  // Removido: lógica de isFirstTimeBuyer - agora usamos visual único para todos

  // ✅ Agora sim, podemos usar condicionais para renderização
  if (optionsQuery.isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-6 h-6 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
        <span className="text-green-600 text-sm font-mono">Carregando opções...</span>
      </div>
    );
  }

  if (optionsQuery.error) {
    return (
      <div className="text-center py-4 text-red-500 text-sm">
        Erro ao carregar opções: {optionsQuery.error.message}
      </div>
    );
  }

  const options = optionsQuery.data || [];
  
  // Log for debugging
  if (options.length > 0) {
    console.log('[ServiceApiOptions] Rendering', options.length, 'options for service', serviceId);
  }

  if (options.length === 0) {
    return (
      <div className="text-center py-4 text-green-600 text-sm">
        Nenhuma opção disponível no momento
      </div>
    );
  }

  const recommendedApiId = recommendationQuery.data?.recommendedApiId;
  const stats = recommendationQuery.data?.stats || [];

  return (
    <div className="space-y-2 api-options-list">
        {options.map((option) => {
          const isRecommended = recommendedApiId === option.apiId;
          const optionStats = stats.find((s: any) => s.apiId === option.apiId);
          
          return (
            <div
              key={option.apiId}
              className={`flex items-center justify-between p-3 bg-gray-800 border rounded transition-colors relative ${
                isRecommended 
                  ? 'border-transparent recommended-border-animation' 
                  : 'border-green-900/30 hover:border-green-500/50'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {/* Estrela amarela para opção recomendada */}
                  {isRecommended && (
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                  )}
                  <p className="text-green-400 font-bold text-sm">{option.apiName}</p>
                  
                  {/* Ícone (i) com tooltip - visual único para todos */}
                  {isRecommended && optionStats && (
                    <SimpleTooltip
                      content={
                        <>
                          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 flex items-center gap-2 rounded-t-md">
                            <StarIcon className="w-4 h-4 fill-black text-black" />
                            <span className="text-black font-bold text-sm">Opção Recomendada</span>
                          </div>
                          <div className="p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <p className="text-green-400 font-semibold">
                                Taxa de sucesso: {optionStats?.successRate}%
                              </p>
                            </div>
                            <p className="text-gray-400 text-xs pl-4">
                              (melhor desempenho entre as opções)
                            </p>
                          </div>
                        </>
                      }
                    >
                      <button 
                        type="button"
                        className="text-yellow-500 text-xs cursor-help bg-transparent border-none p-0 inline-flex items-center"
                      >
                        ⓘ
                      </button>
                    </SimpleTooltip>
                  )}
                </div>
                <p className="text-xs text-green-600 mt-1">
                  R$ {(option.price / 100).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => onBuy(option.apiId, option.apiName, option.price)}
                disabled={isPurchasing || isLocked}
                className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-bold font-mono text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {(isPurchasing || isLocked) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Comprar
              </button>
            </div>
          );
        })}
    </div>
  );
}
