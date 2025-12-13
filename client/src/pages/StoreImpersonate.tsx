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
      console.log('[StoreImpersonate] Token validated successfully:', data);
      
      // ✅ CRÍTICO: Persistir dados do cliente no localStorage
      // StoreAuthContext lê daqui para hidratar o estado
      const customerData = {
        id: data.customer.id,
        name: data.customer.name,
        email: data.customer.email,
        balance: 0, // Será atualizado pela query getCustomer
        pin: data.customer.pin,
        active: true,
      };
      
      console.log('[StoreImpersonate] Saving customer to localStorage:', customerData);
      localStorage.setItem('store_customer', JSON.stringify(customerData));
      
      // ✅ CRÍTICO: Salvar flag de impersonação no localStorage como fallback
      // Isso garante que o banner apareça mesmo se o cookie falhar
      const impersonationData = {
        isImpersonating: true,
        customer: {
          id: data.customer.id,
          email: data.customer.email,
        },
        admin: {
          id: data.admin.id,
          name: data.admin.name,
        },
        timestamp: Date.now(),
      };
      console.log('[StoreImpersonate] Saving impersonation flag to localStorage:', impersonationData);
      localStorage.setItem('impersonation_session', JSON.stringify(impersonationData));
      
      toast.success(`Acesso como ${data.customer.name} iniciado com sucesso!`);
      
      // ✅ Forçar reload da página para reidratar contexto com novos dados
      // Isso garante que StoreAuthContext leia o localStorage atualizado
      console.log('[StoreImpersonate] Reloading page to apply impersonation context');
      window.location.href = '/';
    },
    onError: (error) => {
      toast.error(`Erro ao validar token: ${error.message}`);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        setLocation("/login");
      }, 2000);
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
      toast.error("Token de impersonation não fornecido");
      setLocation("/login");
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
