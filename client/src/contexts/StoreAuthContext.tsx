import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trpc } from '../lib/trpc';
import LoginModal from '../components/LoginModal';
import BannedAccountModal from '../components/BannedAccountModal';
import { useNotifications, type Notification } from '../hooks/useNotifications';
import InitialLoader from '../components/InitialLoader';

// Prefetch das rotas principais para eliminar loading entre páginas
import('../pages/StoreCatalog');
import('../pages/StoreActivations');
import('../pages/StoreAccount');

import('../pages/StoreAffiliate');
import('../pages/StoreRecharges');

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
      // Invalidar queries específicas baseado no tipo de notificação
      if (notification.type === 'pix_payment_confirmed' || notification.type === 'balance_updated') {
        // Forçar refetch imediato do saldo (ignora staleTime)
        utils.store.getCustomer.refetch();
        utils.recharges.getMyRecharges.invalidate();
      }
      if (notification.type === 'sms_received' || notification.type === 'activation_expired') {
        utils.store.getMyActivations.invalidate();
      }
      if (notification.type === 'operation_completed' || notification.type === 'operation_failed') {
        utils.store.getMyActivations.invalidate();
        utils.store.getCustomer.invalidate();
      }
      // Invalidar lista de notificações apenas para notificações admin (que aparecem na sidebar)
      if (notification.type === 'admin_notification') {
        utils.notifications.getAll.invalidate();
      }
    },
  });

  const notifications: any[] = [];

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

  // Prefetch de queries críticas após autenticação para navegação instantânea
  useEffect(() => {
    if (customer?.id) {
      // Prefetch de dados que serão usados em outras páginas
      utils.store.getMyActivations.prefetch({ customerId: customer.id });
      utils.recharges.getMyRecharges.prefetch({ customerId: customer.id });
    }
  }, [customer?.id, utils]);

  useEffect(() => {
    if (getCustomerQuery.data) {
      setCustomer(getCustomerQuery.data);
      localStorage.setItem('store_customer', JSON.stringify(getCustomerQuery.data));
      
      if (getCustomerQuery.data.banned) {
        setIsBannedModalOpen(true);
      }
    } else if (getCustomerQuery.data === null && customer) {
      setCustomer(null);
      localStorage.removeItem('store_customer');
    }
  }, [getCustomerQuery.data, customer]);

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
      const result = await registerMutation.mutateAsync({ email, password, name });
      setCustomer(result);
      localStorage.setItem('store_customer', JSON.stringify(result));
      
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
