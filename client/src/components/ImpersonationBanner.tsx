import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { AlertCircle, X } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useLocation } from "wouter";

export function ImpersonationBanner() {
  const [, setLocation] = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  const { data: session } = trpc.impersonation.getCurrentSession.useQuery(undefined, {
    refetchInterval: 30000, // Check every 30 seconds
  });

  const endSessionMutation = trpc.impersonation.endSession.useMutation({
    onSuccess: () => {
      toast.success("Sessão de suporte encerrada");
      setIsVisible(false);
      // Redirect to login
      setLocation("/login");
    },
    onError: (error) => {
      toast.error(`Erro ao encerrar sessão: ${error.message}`);
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
    if (confirm("Tem certeza que deseja encerrar o acesso de suporte?")) {
      endSessionMutation.mutate();
    }
  };

  if (!isVisible || !session?.isImpersonating) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">
                Modo Suporte Ativo
              </p>
              <p className="text-xs opacity-90">
                Você está acessando como suporte (Admin: {session.admin.name})
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndSession}
            disabled={endSessionMutation.isPending}
            className="bg-white/10 hover:bg-white/20 border-white/30 text-white flex-shrink-0"
          >
            {endSessionMutation.isPending ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Encerrando...
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Encerrar Acesso
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
