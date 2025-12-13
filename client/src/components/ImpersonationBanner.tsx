import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { AlertCircle, X } from "lucide-react";
import { Button } from "./ui/button";
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

  // Get customer name from session
  const customerName = session.customer.name || session.customer.email;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Você está visualizando como{" "}
              <span className="font-bold">{customerName}</span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndSession}
            disabled={endSessionMutation.isPending}
            className="bg-white text-purple-600 hover:bg-purple-50 hover:text-purple-700 border-white flex-shrink-0"
          >
            {endSessionMutation.isPending ? (
              <>
                <span className="mr-2">Encerrando...</span>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Encerrar impersonação
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
