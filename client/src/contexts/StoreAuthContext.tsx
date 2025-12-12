import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { trpc } from '../lib/trpc';
import LoginModal from '../components/LoginModal';
import BannedAccountModal from '../components/BannedAccountModal';
import { useNotifications, type Notification } from '../hooks/useNotifications';
import InitialLoader from '../components/InitialLoader';

// ✅ REMOVIDO: Prefetch de páginas (causava lentidão no carregamento inicial)
// Páginas serão carregadas sob demanda (lazy loading) quando o usuário navegar

interface Customer {
  id: number;
  name: string;
  email: string;
  balance: number;
  pin: number;
  active: boolean;
  banned?: boolean;
  bannedAt?: Date | null;
  bannedReason?: string | null;
  role?: 'admin' | 'user';
}

export interface StoreAuthContextType {
  customer: Customer | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshCustomer: () => Promise<void>;
  requireAuth: (action: () => void) => void;
  isSSEConnected: boolean;
  lastNotification: Notification | null;
  notifications: any[];
}

const StoreAuthContext = createContext<StoreAuthContextType | undefined>(undefined);

export function StoreAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isBannedModalOpen, setIsBannedModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const utils = trpc.useUtils();
  
  // ✅ Hook de debounce para invalidações (prevenir requisições duplicadas)
  const invalidationTimeouts = useRef(new Map<string, NodeJS.Timeout>());
  
  const debouncedInvalidate = useCallback((key: string, fn: () => void, delay = 500) => {
    const timeouts = invalidationTimeouts.current;
    
    // Cancelar timeout anterior se existir
    if (timeouts.has(key)) {
      clearTimeout(timeouts.get(key)!);
    }
    
    // Agendar nova invalidação
    const timeout = setTimeout(() => {
      fn();
      timeouts.delete(key);
    }, delay);
    
    timeouts.set(key, timeout);
  }, []);
  
  // Cleanup de timeouts ao desmontar
  useEffect(() => {
    return () => {
      invalidationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      invalidationTimeouts.current.clear();
    };
  }, []);

  const loginMutation = trpc.store.login.useMutation();
  const registerMutation = trpc.store.register.useMutation();
  
  const getCustomerQuery = trpc.store.getCustomer.useQuery(
    { customerId: customer?.id || 0 },
    { 
      enabled: !!customer?.id,
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10 minutes - reduced refetch frequency
    }
  );



  const { isConnected: isSSEConnected, lastNotification } = useNotifications({
    customerId: customer?.id || null,
    autoToast: true,
    onNotification: (notification) => {
      console.log('[StoreAuthContext] Notification received:', notification.type, notification);
      
      // ✅ OTIMIZAÇÃO: Usar debounce e invalidate() ao invés de refetch()
      // Consolidar invalidações para evitar duplicatas
      
      if (notification.type === 'pix_payment_confirmed' || notification.type === 'balance_updated') {
        console.log('[StoreAuthContext] Balance update detected, scheduling invalidation...');
        console.log('[StoreAuthContext] Current balance:', customer?.balance);
        
        // ✅ Usar invalidate() ao invés de refetch() (respeita staleTime)
        debouncedInvalidate('customer', () => {
          console.log('[StoreAuthContext] Invalidating customer query');
          utils.store.getCustomer.invalidate();
        });
        
        debouncedInvalidate('recharges', () => {
          console.log('[StoreAuthContext] Invalidating recharges query');
          utils.recharges.getMyRecharges.invalidate();
        });
      }
      
      if (notification.type === 'sms_received' || notification.type === 'activation_expired') {
        debouncedInvalidate('activations', () => {
          console.log('[StoreAuthContext] Invalidating activations query');
          utils.store.getMyActivations.invalidate();
        });
      }
      
      if (notification.type === 'operation_completed' || notification.type === 'operation_failed') {
        // ✅ Consolidar invalidações (evitar duplicatas)
        debouncedInvalidate('activations', () => {
          console.log('[StoreAuthContext] Invalidating activations query');
          utils.store.getMyActivations.invalidate();
        });
        
        debouncedInvalidate('customer', () => {
          console.log('[StoreAuthContext] Invalidating customer query');
          utils.store.getCustomer.invalidate();
        });
      }
      
      // Invalidar lista de notificações apenas para notificações admin (que aparecem na sidebar)
      if (notification.type === 'admin_notification') {
        debouncedInvalidate('notifications', () => {
          utils.notifications.getAll.invalidate();
        });
      }
    },
  });

  const notifications: any[] = [];

  // ✅ Capturar parâmetro ref da URL (sistema de afiliados)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    
    if (refParam) {
      // Salvar PIN do afiliado no localStorage
      localStorage.setItem('referral_pin', refParam);
      console.log('[StoreAuthContext] Referral PIN captured:', refParam);
    }
  }, []);

  useEffect(() => {
    const storedCustomer = localStorage.getItem('store_customer');
    if (storedCustomer) {
      try {
        setCustomer(JSON.parse(storedCustomer));
      } catch (error) {
        console.error('Failed to parse stored customer:', error);
        localStorage.removeItem('store_customer');
      }
    }
    setIsLoading(false);
  }, []);

  // ✅ OTIMIZAÇÃO: Prefetch lazy (após 2 segundos) para não bloquear carregamento inicial
  useEffect(() => {
    if (customer?.id) {
      // Agendar prefetch para depois do carregamento inicial
      const timer = setTimeout(() => {
        utils.store.getMyActivations.prefetch({ customerId: customer.id });
        utils.recharges.getMyRecharges.prefetch({ customerId: customer.id });
      }, 2000); // 2 segundos de delay
      
      return () => clearTimeout(timer);
    }
  }, [customer?.id, utils]);

  useEffect(() => {
    if (getCustomerQuery.data) {
      console.log('[StoreAuthContext] Customer data updated:', getCustomerQuery.data);
      console.log('[StoreAuthContext] Balance changed:', customer?.balance, '→', getCustomerQuery.data.balance);
      
      setCustomer(getCustomerQuery.data);
      localStorage.setItem('store_customer', JSON.stringify(getCustomerQuery.data));
      
      if (getCustomerQuery.data.banned) {
        setIsBannedModalOpen(true);
      }
    } else if (getCustomerQuery.data === null) {
      // ✅ OTIMIZAÇÃO: Remover dependência de customer para evitar possível loop
      setCustomer(null);
      localStorage.removeItem('store_customer');
    }
  }, [getCustomerQuery.data]); // ✅ Remover customer das dependências

  const login = async (email: string, password?: string) => {
    try {
      if (!password) {
        throw new Error('Senha é obrigatória');
      }
      const result = await loginMutation.mutateAsync({ email, password });
      setCustomer(result);
      localStorage.setItem('store_customer', JSON.stringify(result));
      
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao fazer login');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      // ✅ Capturar PIN do afiliado do localStorage
      const referralPin = localStorage.getItem('referral_pin');
      
      const result = await registerMutation.mutateAsync({ 
        email, 
        password, 
        name,
        referralPin: referralPin ? parseInt(referralPin, 10) : undefined,
      });
      
      setCustomer(result);
      localStorage.setItem('store_customer', JSON.stringify(result));
      
      // ✅ Limpar referral PIN após registro bem-sucedido
      if (referralPin) {
        localStorage.removeItem('referral_pin');
        console.log('[StoreAuthContext] Referral PIN used and cleared');
      }
      
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao criar conta');
    }
  };

  const logout = () => {
    setCustomer(null);
    localStorage.removeItem('store_customer');
  };

  const refreshCustomer = async () => {
    if (customer?.id) {
      await getCustomerQuery.refetch();
    }
  };

  const requireAuth = (action: () => void) => {
    if (customer) {
      action();
    } else {
      setPendingAction(() => action);
      setIsLoginModalOpen(true);
    }
  };

  const handleLoginModalClose = () => {
    setIsLoginModalOpen(false);
    setPendingAction(null);
  };

  const handleBannedModalClose = () => {
    setIsBannedModalOpen(false);
    logout();
  };

  const contextValue: StoreAuthContextType = {
    customer,
    isLoading,
    isAuthenticated: !!customer,
    login,
    register,
    logout,
    refreshCustomer,
    requireAuth,
    isSSEConnected,
    lastNotification,
    notifications,
  };

  return (
    <StoreAuthContext.Provider value={contextValue}>
      {isLoading ? <InitialLoader /> : children}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleLoginModalClose}
        onLogin={login}
        onRegister={register}
      />
      <BannedAccountModal
        open={isBannedModalOpen}
        onClose={handleBannedModalClose}
      />
    </StoreAuthContext.Provider>
  );
}

export function useStoreAuth() {
  const context = useContext(StoreAuthContext);
  if (context === undefined) {
    throw new Error('useStoreAuth must be used within a StoreAuthProvider');
  }
  return context;
}
