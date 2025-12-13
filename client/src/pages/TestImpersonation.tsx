import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TestImpersonation() {
  const simulateImpersonation = () => {
    const impersonationData = {
      isImpersonating: true,
      customer: {
        id: 999,
        email: "teste@exemplo.com",
      },
      admin: {
        id: 1,
        name: "Admin Teste",
      },
      timestamp: Date.now(),
    };
    
    localStorage.setItem('impersonation_session', JSON.stringify(impersonationData));
    toast.success("Impersonação simulada! Recarregando página...");
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const clearImpersonation = () => {
    localStorage.removeItem('impersonation_session');
    toast.success("Impersonação limpa! Recarregando página...");
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const checkLocalStorage = () => {
    const stored = localStorage.getItem('impersonation_session');
    console.log('[Test] localStorage impersonation_session:', stored);
    if (stored) {
      toast.info("Dados encontrados no localStorage (veja console)");
    } else {
      toast.info("Nenhum dado de impersonação no localStorage");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">🧪 Teste de Banner de Impersonação</h1>
        
        <div className="bg-gray-800 p-6 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">Instruções:</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Clique em "Simular Impersonação"</li>
            <li>A página vai recarregar</li>
            <li>O banner roxo deve aparecer no topo</li>
            <li>Se aparecer: ✅ Banner funciona, problema está no fluxo de auth</li>
            <li>Se não aparecer: ❌ Problema está no componente do banner</li>
          </ol>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={simulateImpersonation}
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            🎭 Simular Impersonação
          </Button>

          <Button 
            onClick={clearImpersonation}
            variant="outline"
            className="w-full"
            size="lg"
          >
            🧹 Limpar Impersonação
          </Button>

          <Button 
            onClick={checkLocalStorage}
            variant="secondary"
            className="w-full"
            size="lg"
          >
            🔍 Verificar localStorage
          </Button>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-600 p-4 rounded-lg">
          <p className="text-yellow-400 text-sm">
            ⚠️ Esta é uma página de teste. Após validar o banner, navegue para outra página (Dashboard, Histórico, etc) para ver se o banner persiste.
          </p>
        </div>
      </div>
    </div>
  );
}
