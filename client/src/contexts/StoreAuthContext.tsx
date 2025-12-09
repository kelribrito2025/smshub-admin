import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { trpc } from '../lib/trpc';
import LoginModal from '../components/LoginModal';
import BannedAccountModal from '../components/BannedAccountModal';
import { useNotifications, Notification } from '../hooks/useNotifications';

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
  role?: 'admin' | 'user'; // Role from users table (if customer has admin account)
}

interface StoreNotification {
  id: number;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  data?: any;
}

interface StoreAuthContextType {
  customer: Customer | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isNotificationsConnected: boolean;
  notifications: StoreNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshCustomer: () => Promise<void>;
  requireAuth: (action: () => void) => void;
  onNotification: (callback: (notification: Notification) => void) => () => void; // Subscribe to notifications
}

const StoreAuthContext = createContext<StoreAuthContextType | undefined>(undefined);

export function StoreAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isBannedModalOpen, setIsBannedModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  
  // Notification subscribers (components can subscribe to notifications)
  const notificationCallbacksRef = useRef<Set<(notification: Notification) => void>>(new Set());

  const loginMutation = trpc.store.login.useMutation();
  const registerMutation = trpc.store.register.useMutation();
  const utils = trpc.useUtils();
  
  // ✅ SINGLE SOURCE OF TRUTH: Only query customer here
  const getCustomerQuery = trpc.store.getCustomer.useQuery(
    { customerId: customer?.id || 0 },
    { 
      enabled: !!customer?.id, 
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes (balance updates via SSE)
    }
  );

  // ✅ SINGLE SSE CONNECTION: Handle notifications centrally
  const handleNotification = useCallback((notification: Notification) => {
    console.log('[StoreAuthContext] Received notification:', notification);
    
    // Invalidate customer query when balance is updated
    if (notification.type === 'pix_payment_confirmed' || notification.type === 'balance_updated') {
      utils.store.getCustomer.invalidate();
    }
    
    // Invalidate recharges when payment is confirmed
    if (notification.type === 'recharge_completed') {
      utils.recharges.getMyRecharges.invalidate();
      utils.store.getCustomer.invalidate();
    }
    
    // Invalidate activations when purchase is completed or failed
    if (notification.type === 'operation_completed' || notification.type === 'operation_failed') {
      utils.store.getMyActivations.invalidate();
    }
    
    // Broadcast notification to all subscribers (StoreLayout, pages, etc.)
    notificationCallbacksRef.current.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('[StoreAuthContext] Error in notification callback:', error);
      }
    });
  }, [utils]);

  // ✅ SINGLE SSE CONNECTION: Connect only once per session
  const { isConnected: isNotificationsConnected } = useNotifications({
    customerId: customer?.id || null,
    onNotification: handleNotification,
    autoToast: false, // Don't auto-toast here, let subscribers handle it
  });

  // ✅ SINGLE NOTIFICATIONS QUERY: Centralized notifications state
  const notificationsQuery = trpc.notifications.getAll.useQuery(undefined, {
    enabled: !!customer?.id,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 seconds (updates via SSE)
    retry: 1, // Avoid retry storms on 403
  });

  const notifications = notificationsQuery.data || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const refreshNotifications = useCallback(async () => {
    await notificationsQuery.refetch();
  }, [notificationsQuery]);

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
    setCustomer(null);
    localStorage.removeItem('store_customer');
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

  // Subscribe to notifications (returns unsubscribe function)
  const onNotification = useCallback((callback: (notification: Notification) => void) => {
    notificationCallbacksRef.current.add(callback);
    return () => {
      notificationCallbacksRef.current.delete(callback);
    };
  }, []);

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
        isNotificationsConnected,
        notifications,
        unreadCount,
        refreshNotifications,
        login,
        register,
        logout,
        refreshCustomer,
        requireAuth,
        onNotification,
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
