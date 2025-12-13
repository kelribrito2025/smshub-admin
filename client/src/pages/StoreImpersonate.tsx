import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StoreImpersonate() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [isValidating, setIsValidating] = useState(true);

  const validateTokenMutation = trpc.impersonation.validateToken.useMutation({
    onSuccess: (data) => {
      // ✅ Persistir dados completos do cliente no localStorage
      localStorage.setItem('store_customer', JSON.stringify(data.customer));
      
      toast.success(`Acesso como ${data.customer.name} iniciado com sucesso!`);
      
      // ✅ Aguardar um momento para garantir que localStorage foi atualizado
      // e então forçar reload completo da página para recarregar o StoreAuthContext
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    },
    onError: (error) => {
      toast.error(`Erro ao validar token: ${error.message}`);
      
      // ❌ NÃO redirecionar para login - apenas mostrar erro
      setIsValidating(false);
      
      // Opcional: redirecionar de volta para admin após 3 segundos
      setTimeout(() => {
        window.location.href = "/admin/clientes";
      }, 3000);
    },
    onSettled: () => {
      setIsValidating(false);
    },
  });

  useEffect(() => {
    // Extract token from URL query params
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      toast.error("Token de impersonação não fornecido");
      
      // Redirecionar de volta para admin
      setTimeout(() => {
        window.location.href = "/admin/clientes";
      }, 2000);
      return;
    }

    // Validate token and create support session
    validateTokenMutation.mutate({ token });
  }, [location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            {isValidating ? "Validando acesso..." : "Redirecionando..."}
          </h1>
          <p className="text-gray-400">
            Aguarde enquanto configuramos sua sessão de suporte
          </p>
        </div>
      </div>
    </div>
  );
}
