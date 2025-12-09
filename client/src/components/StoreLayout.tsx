import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '../lib/trpc';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Star, Wallet, Globe, User, Loader2, Copy, ChevronDown, ChevronUp, LogOut, LogIn, Menu, X, Shield, Sparkles, History, LayoutDashboard, Check, Settings, Gift, TrendingUp, TrendingDown, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import ServiceApiOptions from './ServiceApiOptions';
import { copyToClipboard, playNotificationSound } from '../lib/utils';
import { RechargeModal } from './RechargeModal';
import NotificationsSidebar from './NotificationsSidebar';
import ServiceListSkeleton from './ServiceListSkeleton';
import { useCountUp } from '../hooks/useCountUp';
import { useOperationLock } from '../hooks/useOperationLock';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

// Set SEO-optimized title for store pages
if (typeof document !== 'undefined') {
  document.title = 'Número virtual - Receba SMS online sem precisar de chip físico. Números virtuais para criação e verificação de contas e proteção de privacidade.';
}


interface StoreLayoutProps {
  children: ReactNode;
}

export default function StoreLayout({ children }: StoreLayoutProps) {
  // ✅ Consume from context (single source of truth)
  const { customer, isAuthenticated, requireAuth, logout, unreadCount, onNotification } = useStoreAuth();
  const { isLocked } = useOperationLock();
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<number | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string>('any');
  const [showFavorites, setShowFavorites] = useState(() => {
    const saved = localStorage.getItem('store_show_favorites');
    return saved === 'true';
  });
  const [buyingServiceKey, setBuyingServiceKey] = useState<string | null>(null);
  const [loadingApiId, setLoadingApiId] = useState<number | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false); // Estado global de compra
  const [previousActivations, setPreviousActivations] = useState<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  const [expandedServices, setExpandedServices] = useState<Set<number>>(new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [notificationsSidebarOpen, setNotificationsSidebarOpen] = useState(false);
  const [balanceFlash, setBalanceFlash] = useState<'green' | 'red' | null>(null);
  const previousBalance = useRef<number | null>(null);
  const lastPurchaseNotification = useRef<number>(0); // Timestamp of last purchase notification

  // Configure conservative refetch to avoid 429 (Too Many Requests)
  const servicesQuery = trpc.store.getServices.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
  const countriesQuery = trpc.store.getCountries.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
  const pricesQuery = trpc.store.getPrices.useQuery({}, {
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
  const operatorsQuery = trpc.store.getOperators.useQuery(
    { countryId: selectedCountry || undefined },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    }
  );

  // ✅ REMOVED: customerQuery (now from context)
  // ✅ REMOVED: activationsQuery (pages load their own)
  // ✅ REMOVED: notificationsQuery (now from context)
  // ✅ REMOVED: SSE connection (now in context)
  
  const favoritesQuery = trpc.store.getFavorites.useQuery(
    { customerId: customer?.id || 0 },
    { 
      enabled: !!customer?.id,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    }
  );
  
  const utils = trpc.useUtils();

  // ✅ Subscribe to notifications from context
  useEffect(() => {
    const unsubscribe = onNotification((notification) => {
      console.log('[StoreLayout] Received notification:', notification);
      
      // Handle purchase completion notification (only show after backend confirms)
      if (notification.type === 'operation_completed' && notification.data?.operation === 'purchase') {
        // Debounce: ignore duplicate notifications within 2 seconds
        const now = Date.now();
        if (now - lastPurchaseNotification.current < 2000) {
          console.log('[StoreLayout] Ignoring duplicate purchase notification (debounced)');
          return;
        }
        lastPurchaseNotification.current = now;
        
        console.log('[StoreLayout] Purchase completed - showing success notification');
        toast.success(notification.title || 'Compra realizada', {
          description: notification.message || 'Número SMS adquirido com sucesso',
          duration: 5000,
        });
        playNotificationSound('purchase');
      }
      
      // Handle admin notifications
      if (notification.type === 'admin_notification') {
        toast.info(notification.title, {
          description: notification.message,
          duration: 6000,
          icon: "📢",
        });
      }
    });

    return unsubscribe;
  }, [onNotification]);
  
  const toggleFavoriteMutation = trpc.store.toggleFavorite.useMutation({
    onSuccess: async () => {
      await utils.store.getFavorites.invalidate();
      toast.success('Favorito atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao marcar favorito', {
        description: error.message,
      });
    },
  });
  
  const purchaseMutation = trpc.store.purchaseNumber.useMutation();

  // Set Brazil as default country when countries are loaded
  useEffect(() => {
    if (countriesQuery.data && selectedCountry === null) {
      const brazil = countriesQuery.data.find((c: any) => c.code === 'brazil');
      if (brazil) {
        setSelectedCountry(brazil.id);
      }
    }
  }, [countriesQuery.data, selectedCountry]);

  // Reset showFavorites when user logs out
  useEffect(() => {
    if (!isAuthenticated && showFavorites) {
      setShowFavorites(false);
      localStorage.setItem('store_show_favorites', 'false');
    }
  }, [isAuthenticated, showFavorites]);

  const formatBalance = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;

  // Construir mapa de preços por (serviceId, countryId)
  const priceMap = new Map<string, number>();
  if (pricesQuery.data) {
    pricesQuery.data.forEach((p: any) => {
      const key = `${p.serviceId}-${p.countryId}`;
      priceMap.set(key, p.ourPrice);
    });
  }

  // Filtrar serviços com base no país selecionado e termo de busca
  const filteredServices = (servicesQuery.data || []).filter((service: any) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Agrupar serviços por país
  const servicesByCountry = new Map<number, any[]>();
  filteredServices.forEach((service: any) => {
    service.countries?.forEach((country: any) => {
      if (!selectedCountry || country.id === selectedCountry) {
        if (!servicesByCountry.has(country.id)) {
          servicesByCountry.set(country.id, []);
        }
        servicesByCountry.get(country.id)!.push({ ...service, country });
      }
    });
  });

  // Ordenar países: Brasil primeiro, depois alfabeticamente
  const sortedCountries = Array.from(servicesByCountry.keys()).sort((a, b) => {
    const countryA = countriesQuery.data?.find((c: any) => c.id === a);
    const countryB = countriesQuery.data?.find((c: any) => c.id === b);
    
    // Brasil sempre primeiro
    if (countryA?.code === 'brazil') return -1;
    if (countryB?.code === 'brazil') return 1;
    
    // Depois alfabeticamente
    return (countryA?.name || '').localeCompare(countryB?.name || '');
  });

  const handlePurchase = async (serviceId: number, countryId: number, apiId: number) => {
    if (!isAuthenticated) {
      requireAuth(() => handlePurchase(serviceId, countryId, apiId));
      return;
    }

    if (isLocked) {
      toast.error('Operação em andamento', {
        description: 'Aguarde a conclusão da operação anterior',
      });
      return;
    }

    if (isPurchasing) {
      toast.error('Compra em andamento', {
        description: 'Aguarde a conclusão da compra anterior',
      });
      return;
    }

    const serviceKey = `${serviceId}-${countryId}`;
    setBuyingServiceKey(serviceKey);
    setLoadingApiId(apiId);
    setIsPurchasing(true);

    try {
      console.log('[Store] Purchasing number...', { serviceId, countryId, apiId });
      
      const result = await purchaseMutation.mutateAsync({
        customerId: customer?.id || 0,
        serviceId,
        countryId,
        operator: selectedOperator === 'any' ? undefined : selectedOperator,
        apiId,
      });

      console.log('[Store] Purchase mutation completed:', result);
      
      // ✅ Invalidate activations to show new purchase
      await utils.store.getMyActivations.invalidate();
      
      // Success toast will be shown by SSE notification (operation_completed)
      // This prevents duplicate toasts
    } catch (error: any) {
      console.error('[Store] Purchase failed:', error);
      toast.error('Erro ao comprar número', {
        description: error.message || 'Tente novamente',
        duration: 5000,
      });
    } finally {
      setBuyingServiceKey(null);
      setLoadingApiId(null);
      setIsPurchasing(false);
    }
  };

  const toggleFavorite = (serviceId: number) => {
    if (!isAuthenticated) {
      requireAuth(() => toggleFavorite(serviceId));
      return;
    }

    toggleFavoriteMutation.mutate({
      customerId: customer?.id || 0,
      serviceId,
    });
  };

  const toggleService = (serviceId: number) => {
    setExpandedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const handleShowFavoritesToggle = () => {
    if (!isAuthenticated) {
      requireAuth(() => handleShowFavoritesToggle());
      return;
    }
    
    const newValue = !showFavorites;
    setShowFavorites(newValue);
    localStorage.setItem('store_show_favorites', String(newValue));
  };

  const favoriteServiceIds = new Set(
    (favoritesQuery.data || []).map((f: any) => f.serviceId)
  );

  // Filtrar serviços favoritos se a opção estiver ativada
  const displayedCountries = showFavorites
    ? sortedCountries.filter(countryId => {
        const services = servicesByCountry.get(countryId) || [];
        return services.some(service => favoriteServiceIds.has(service.id));
      })
    : sortedCountries;

  // Animated balance with useCountUp hook
  const displayBalance = useCountUp(customer?.balance || 0, 500);

  // Flash effect when balance changes
  useEffect(() => {
    if (customer?.balance !== undefined && previousBalance.current !== null) {
      if (customer.balance > previousBalance.current) {
        setBalanceFlash('green');
        setTimeout(() => setBalanceFlash(null), 500);
      } else if (customer.balance < previousBalance.current) {
        setBalanceFlash('red');
        setTimeout(() => setBalanceFlash(null), 500);
      }
    }
    previousBalance.current = customer?.balance || null;
  }, [customer?.balance]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/50 bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/80">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <button
              onClick={() => setLocation('/store')}
              className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent hover:from-cyan-300 hover:to-blue-400 transition-all"
            >
              <Globe className="w-6 h-6 text-cyan-400" />
              <span className="hidden sm:inline">SMS Hub</span>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Button
                variant={location === '/store' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setLocation('/store')}
                className="text-slate-300 hover:text-white"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Loja
              </Button>
              {isAuthenticated && (
                <>
                  <Button
                    variant={location === '/store/activations' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setLocation('/store/activations')}
                    className="text-slate-300 hover:text-white"
                  >
                    <History className="w-4 h-4 mr-2" />
                    Ativações
                  </Button>
                  <Button
                    variant={location === '/store/account' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setLocation('/store/account')}
                    className="text-slate-300 hover:text-white"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Conta
                  </Button>
                  <Button
                    variant={location === '/store/affiliate' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setLocation('/store/affiliate')}
                    className="text-slate-300 hover:text-white"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Afiliados
                  </Button>
                </>
              )}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  {/* Balance */}
                  <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                    balanceFlash === 'green' 
                      ? 'bg-green-500/20 border-green-500/50 shadow-lg shadow-green-500/20' 
                      : balanceFlash === 'red'
                      ? 'bg-red-500/20 border-red-500/50 shadow-lg shadow-red-500/20'
                      : 'bg-slate-800/50 border-slate-700/50'
                  }`}>
                    <Wallet className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-white">
                      {formatBalance(displayBalance)}
                    </span>
                  </div>

                  {/* Recharge button */}
                  <Button
                    size="sm"
                    onClick={() => setRechargeModalOpen(true)}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/20"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Recarregar</span>
                  </Button>

                  {/* Notifications bell */}
                  <button
                    onClick={() => setNotificationsSidebarOpen(true)}
                    className="relative p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {/* Badge de notificações não lidas - só pisca quando há notificações não lidas */}
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                  </button>

                  {/* User menu (desktop) */}
                  <div className="hidden md:block">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                          <User className="w-4 h-4 mr-2" />
                          {customer?.name}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setLocation('/store/account')}>
                          <User className="w-4 h-4 mr-2" />
                          Minha Conta
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLocation('/store/security')}>
                          <Shield className="w-4 h-4 mr-2" />
                          Segurança
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLocation('/store/settings')}>
                          <Settings className="w-4 h-4 mr-2" />
                          Configurações
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={logout} className="text-red-400">
                          <LogOut className="w-4 h-4 mr-2" />
                          Sair
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Mobile menu button */}
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setLocation('/store/login')}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar
                </Button>
              )}
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && isAuthenticated && (
            <div className="md:hidden mt-4 pb-2 border-t border-slate-800/50 pt-4 space-y-2">
              <Button
                variant={location === '/store' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setLocation('/store');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start text-slate-300 hover:text-white"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Loja
              </Button>
              <Button
                variant={location === '/store/activations' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setLocation('/store/activations');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start text-slate-300 hover:text-white"
              >
                <History className="w-4 h-4 mr-2" />
                Ativações
              </Button>
              <Button
                variant={location === '/store/account' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setLocation('/store/account');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start text-slate-300 hover:text-white"
              >
                <User className="w-4 h-4 mr-2" />
                Conta
              </Button>
              <Button
                variant={location === '/store/affiliate' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setLocation('/store/affiliate');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start text-slate-300 hover:text-white"
              >
                <Gift className="w-4 h-4 mr-2" />
                Afiliados
              </Button>
              <Button
                variant={location === '/store/security' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setLocation('/store/security');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start text-slate-300 hover:text-white"
              >
                <Shield className="w-4 h-4 mr-2" />
                Segurança
              </Button>
              <Button
                variant={location === '/store/settings' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setLocation('/store/settings');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start text-slate-300 hover:text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>
              
              {/* Mobile balance */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                balanceFlash === 'green' 
                  ? 'bg-green-500/20 border-green-500/50' 
                  : balanceFlash === 'red'
                  ? 'bg-red-500/20 border-red-500/50'
                  : 'bg-slate-800/50 border-slate-700/50'
              }`}>
                <span className="text-sm text-slate-400">Saldo:</span>
                <span className="text-sm font-semibold text-white">
                  {formatBalance(displayBalance)}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-start text-red-400 hover:text-red-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Modals */}
      <RechargeModal
        isOpen={rechargeModalOpen}
        onClose={() => setRechargeModalOpen(false)}
      />
      
      <NotificationsSidebar
        isOpen={notificationsSidebarOpen}
        onClose={() => setNotificationsSidebarOpen(false)}
      />
    </div>
  );
}
