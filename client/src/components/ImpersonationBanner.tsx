
import { trpc } from "@/lib/trpc";
import { AlertTriangle, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useLocation } from "wouter";

export function ImpersonationBanner() {
  const [, setLocation] = useLocation();

  const { data: session } = trpc.impersonation.getCurrentSession.useQuery();

  const endSessionMutation = trpc.impersonation.endSession.useMutation({
    onSuccess: () => {
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

  if (!session?.isImpersonating) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="font-semibold">Modo de Impersonação:</span>
              <span className="text-purple-100">
                Você está visualizando como <strong>{session.customer.email}</strong>
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
