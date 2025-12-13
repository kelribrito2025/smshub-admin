
import { trpc } from "@/lib/trpc";
import { AlertTriangle, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useLocation } from "wouter";

export function ImpersonationBanner() {
  const [, setLocation] = useLocation();

  const { data: session, isLoading, error } = trpc.impersonation.getCurrentSession.useQuery();
  
  // Fallback: ler do localStorage se cookie falhar
  const localStorageSession = (() => {
    try {
      const stored = localStorage.getItem('impersonation_session');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Verificar se não expirou (10 minutos)
      const age = Date.now() - (parsed.timestamp || 0);
      if (age > 10 * 60 * 1000) {
        localStorage.removeItem('impersonation_session');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  })();
  
  // Usar cookie se disponível, senão usar localStorage
  const activeSession = session || localStorageSession;
  
  console.log('[ImpersonationBanner] Render:', { 
    cookieSession: session, 
    localStorageSession, 
    activeSession,
    isLoading, 
    error 
  });

  const endSessionMutation = trpc.impersonation.endSession.useMutation({
    onSuccess: () => {
      // Limpar localStorage
      localStorage.removeItem('impersonation_session');
      localStorage.removeItem('store_customer');
      
      toast.success("Impersonação encerrada com sucesso");
      // Redirect to admin customers page
      setLocation("/admin/customers");
      // Reload to clear state
      window.location.reload();
    },
    onError: (error) => {
      toast.error(`Erro ao encerrar impersonação: ${error.message}`);
    },
  });



  const handleEndSession = () => {
    endSessionMutation.mutate();
  };

  if (isLoading) {
    console.log('[ImpersonationBanner] Still loading...');
    return null;
  }
  
  if (error) {
    console.error('[ImpersonationBanner] Error loading session:', error);
    return null;
  }
  
  if (!activeSession?.isImpersonating) {
    console.log('[ImpersonationBanner] Not impersonating, activeSession:', activeSession);
    return null;
  }
  
  console.log('[ImpersonationBanner] Showing banner for:', activeSession.customer?.email);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="font-semibold">Modo de Impersonação:</span>
              <span className="text-purple-100">
                Você está visualizando como <strong>{activeSession?.customer?.email || 'Usuário desconhecido'}</strong>
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndSession}
            disabled={endSessionMutation.isPending}
            className="bg-white text-purple-600 hover:bg-purple-50 hover:text-purple-700 border-white flex-shrink-0"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {endSessionMutation.isPending ? "Encerrando..." : "Encerrar Impersonação"}
          </Button>
        </div>
      </div>
    </div>
  );
}
