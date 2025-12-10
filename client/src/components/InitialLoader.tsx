import React from 'react';

/**
 * InitialLoader - Componente de loading inicial personalizado
 * 
 * Usado exclusivamente durante a primeira verificação de autenticação.
 * Usa fundo preto e ícone verde para consistência visual com o resto da aplicação.
 */
export default function InitialLoader() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Spinner verde */}
        <div className="relative">
          <div className="w-12 h-12 border-3 border-green-900/30 border-t-green-500 rounded-full animate-spin"></div>
          
          {/* Ponto central pulsante verde */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Texto de loading */}
        <div className="text-gray-400 text-sm font-medium animate-pulse font-mono">
          Carregando...
        </div>
      </div>
    </div>
  );
}
