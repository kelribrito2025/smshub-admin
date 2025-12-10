import React from 'react';

/**
 * InitialLoader - Componente de loading inicial personalizado
 * 
 * Usado exclusivamente durante a primeira verificação de autenticação
 * para evitar flash preto com ícone de loading azul.
 * 
 * Usa as mesmas cores do sistema (painel de vendas) para transição suave.
 */
export default function InitialLoader() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Logo ou ícone do sistema */}
        <div className="relative">
          {/* Spinner externo */}
          <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
          
          {/* Ponto central pulsante */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Texto de loading (opcional) */}
        <div className="text-slate-400 text-sm font-medium animate-pulse">
          Carregando...
        </div>
      </div>
    </div>
  );
}
