import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { useStoreAuth } from "@/contexts/StoreAuthContext";

export function ImpersonationBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const { logout } = useStoreAuth();

  const { data: session } = trpc.impersonation.getCurrentSession.useQuery(undefined, {
    refetchInterval: 30000, // Check every 30 seconds
    refetchOnWindowFocus: false,
    staleTime: 25000,
  });

  const endSessionMutation = trpc.impersonation.endSession.useMutation({
    onSuccess: () => {
      toast.success("Impersonação encerrada com sucesso");
      setIsVisible(false);
      
      // Reset store auth context
      logout();
      
      // Close current tab/window
      window.close();
      
      // Fallback: if window.close() doesn't work (some browsers block it),
      // redirect to admin dashboard
      setTimeout(() => {
        window.location.href = "/admin";
      }, 100);
    },
    onError: (error) => {
      toast.error(`Erro ao encerrar impersonação: ${error.message}`);
    },
  });

  useEffect(() => {
    if (session?.isImpersonating) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [session]);

  const handleEndSession = () => {
    endSessionMutation.mutate();
  };

  if (!isVisible || !session?.isImpersonating) {
    return null;
  }

  // Get customer email and ID from session
  const customerEmail = session.customer.email;
  const customerId = session.customer.id;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg animate-pulse-slow">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle size={20} className="animate-pulse" />
          <span className="text-sm font-medium">
            Você está visualizando como <strong className="font-semibold">{customerEmail}</strong> - ID: <strong className="font-semibold">#{customerId}</strong>
          </span>
        </div>

        <button
          onClick={handleEndSession}
          disabled={endSessionMutation.isPending}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium border border-white/30 hover:border-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {endSessionMutation.isPending ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Encerrando...
            </>
          ) : (
            <>
              <X size={16} />
              Encerrar Impersonação
            </>
          )}
        </button>
      </div>
    </div>
  );
}
