export function AffiliateSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-black/50 border border-green-900/50 rounded-lg p-6">
            <div className="h-4 bg-green-900/30 rounded w-24 mb-4"></div>
            <div className="h-8 bg-green-900/30 rounded w-32 mb-2"></div>
            <div className="h-3 bg-green-900/20 rounded w-20"></div>
          </div>
        ))}
      </div>

      {/* Card de Link de Indicação */}
      <div className="bg-black/50 border border-green-900/50 rounded-lg p-6">
        <div className="h-5 bg-green-900/30 rounded w-40 mb-4"></div>
        <div className="flex gap-2">
          <div className="flex-1 h-12 bg-green-900/20 rounded"></div>
          <div className="w-24 h-12 bg-green-900/30 rounded"></div>
        </div>
        <div className="h-3 bg-green-900/20 rounded w-64 mt-3"></div>
      </div>

      {/* Card de Saldo de Bônus */}
      <div className="bg-black/50 border border-green-900/50 rounded-lg p-6">
        <div className="h-5 bg-green-900/30 rounded w-32 mb-4"></div>
        <div className="h-10 bg-green-900/30 rounded w-40 mb-2"></div>
        <div className="h-3 bg-green-900/20 rounded w-56"></div>
      </div>

      {/* Card de Regras */}
      <div className="bg-black/50 border border-green-900/50 rounded-lg p-6">
        <div className="h-5 bg-green-900/30 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-5 h-5 bg-green-900/30 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <div className="h-4 bg-green-900/20 rounded w-full mb-2"></div>
                <div className="h-4 bg-green-900/20 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabela de Histórico */}
      <div className="bg-black/50 border border-green-900/50 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-green-900/50">
          <div className="h-5 bg-green-900/30 rounded w-48"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-green-900/50">
                {[1, 2, 3, 4, 5].map((i) => (
                  <th key={i} className="px-6 py-4 text-left">
                    <div className="h-4 bg-green-900/30 rounded w-20"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((row) => (
                <tr key={row} className="border-b border-green-900/30">
                  {[1, 2, 3, 4, 5].map((col) => (
                    <td key={col} className="px-6 py-4">
                      <div className="h-4 bg-green-900/20 rounded" style={{ width: `${60 + Math.random() * 30}%` }}></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
