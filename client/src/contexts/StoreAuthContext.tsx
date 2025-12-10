import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trpc } from '../lib/trpc';
import LoginModal from '../components/LoginModal';
import BannedAccountModal from '../components/BannedAccountModal';
import { useNotifications, type Notification } from '../hooks/useNotifications';

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
}

// Force TypeScript recompilation
interface StoreAuthContextType {
  customer: Customer | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshCustomer: () => Promise<void>;
  requireAuth: (action: () => void) => void;
  // SSE connection state
  isSSEConnected: boolean;
  lastNotification: Notification | null;
  // Notifications state
  notifications: any[];
  unreadCount: number;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
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
  // ✅ CENTRALIZADO: Query única de customer (sem polling - SSE invalida quando necessário)
  const getCustomerQuery = trpc.store.getCustomer.useQuery(
    { customerId: customer?.id || 0 },
    { 
      enabled: !!customer?.id,
      retry: 1, // Apenas 1 retry para evitar 429
      refetchOnWindowFocus: false, // SSE invalida quando necessário
      staleTime: 5 * 60 * 1000, // Dados frescos por 5 minutos
    }
  );

  // ✅ CENTRALIZADO: Query única de notificações (sem polling - SSE invalida quando necessário)
  const notificationsQuery = trpc.notifications.getAll.useQuery(undefined, {
    enabled: !!customer?.id,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 0, // Sempre considerar stale para refetch imediato após invalidação
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getAll.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getAll.invalidate();
    },
  });

  const markAsRead = async (notificationId: number) => {
    await markAsReadMutation.mutateAsync({ id: notificationId });
  };

  const markAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  // ✅ CENTRALIZADO: SSE única conexão para notificações e eventos
  console.log('[StoreAuthContext] 🔍 Iniciando useNotifications com customerId:', customer?.id);
  const { isConnected: isSSEConnected, lastNotification } = useNotifications({
    customerId: customer?.id || null,
    autoToast: true, // Mostrar toasts automaticamente
    onNotification: (notification) => {
      console.log('[StoreAuthContext] 📬 Nova notificação recebida via SSE:', notification.type);
      // Invalidar queries relevantes baseado no tipo de notificação
      if (notification.type === 'pix_payment_confirmed' || notification.type === 'balance_updated') {
        utils.store.getCustomer.invalidate();
        utils.recharges.getMyRecharges.invalidate();
      }
      if (notification.type === 'sms_received' || notification.type === 'activation_expired') {
        utils.store.getMyActivations.invalidate();
      }
      if (notification.type === 'operation_completed' || notification.type === 'operation_failed') {
        utils.store.getMyActivations.invalidate();
        utils.store.getCustomer.invalidate();
      }
      // Forçar refetch imediato de notificações para atualizar badge
      console.log('[StoreAuthContext] 🔄 Forçando refetch de notificações...');
      utils.notifications.getAll.refetch();
      console.log('[StoreAuthContext] ✅ Refetch de notificações disparado');
    },
  });

  const notifications = notificationsQuery.data || [];
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;
  
  // Debug: log quando notifications mudar
  useEffect(() => {
    console.log('[StoreAuthContext] 📦 Notifications atualizadas:', notifications.length, 'total,', unreadCount, 'não lidas');
  }, [notifications.length, unreadCount]);

  // Load customer from localStorage on mount
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

  // Update customer data when query succeeds
  useEffect(() => {
    if (getCustomerQuery.data) {
      setCustomer(getCustomerQuery.data);
      localStorage.setItem('store_customer', JSON.stringify(getCustomerQuery.data));
      
      // Check if customer is banned
      if (getCustomerQuery.data.banned) {
        setIsBannedModalOpen(true);
      }
    } else if (getCustomerQuery.data === null && customer) {
      // ✅ CORREÇÃO: Se query retornar null, limpar estado (cliente não existe mais)
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
      
      // Execute pending action if exists
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
      
      // Execute pending action if exists
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao criar conta');
    }
  };

  const logout = () => {
    console.log('[StoreAuthContext] 🚪 Logout: limpando customer e forçando desconexão SSE');
    setCustomer(null);
    localStorage.removeItem('store_customer');
    // Forçar desconexão SSE ao limpar customer (useNotifications detectará customerId = null)
  };

  const refreshCustomer = async () => {
    if (customer?.id) {
      await getCustomerQuery.refetch();
    }
  };

  // Function to require authentication before executing an action
  const requireAuth = (action: () => void) => {
    if (customer) {
      // Already authenticated, execute immediately
      action();
    } else {
      // Not authenticated, save action and show login modal
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
    logout(); // Force logout when banned modal is closed
  };

  return (
    <StoreAuthContext.Provider
      value={{
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
        unreadCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
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
