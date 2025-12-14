import React, { useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '../lib/trpc';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Star, Wallet, Globe, User, Loader2, Copy, ChevronDown, ChevronUp, LogOut, LogIn, Menu, X, Shield, Sparkles, History, LayoutDashboard, Check, Gift, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { useStoreAuth } from '../contexts/StoreAuthContext';
import ServiceApiOptions from './ServiceApiOptions';
import { copyToClipboard, playNotificationSound } from '../lib/utils';
import { RechargeModal } from './RechargeModal';
import { ImpersonationBanner } from './ImpersonationBanner';

import ServiceListSkeleton from './ServiceListSkeleton';
import { useCountUp } from '../hooks/useCountUp';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
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
  const authContext = useStoreAuth();
  const customer = authContext.customer;
  const isAuthenticated = authContext.isAuthenticated;
  const requireAuth = authContext.requireAuth;
  const logout = authContext.logout;
  const isSSEConnected = authContext.isSSEConnected;
  const lastNotification = authContext.lastNotification;
  const notifications = authContext.notifications;

  // ✅ REMOVIDO: useOperationLock (SSE agora está centralizado no StoreAuthContext)
  const isLocked = false; // Operações não são mais bloqueadas globalmente
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

  const [balanceFlash, setBalanceFlash] = useState<'green' | 'red' | null>(null);
  const previousBalance = useRef<number | null>(null);
  const lastPurchaseNotification = useRef<number>(0); // Timestamp of last purchase notification
  
  // ✅ CORREÇÃO: Usar localStorage para persistir notificações exibidas entre navegações
  const getDisplayedNotifications = (): Set<string> => {
    try {
      const stored = localStorage.getItem('displayed_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Limpar notificações antigas (mais de 1 hora)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const filtered = parsed.filter((item: any) => item.timestamp > oneHourAgo);
        return new Set(filtered.map((item: any) => item.id));
      }
    } catch (e) {
      console.error('Error loading displayed notifications:', e);
    }
    return new Set();
  };
  
  const displayedNotifications = useRef<Set<string>>(getDisplayedNotifications());

  // Configure conservative refetch to avoid 429 (Too Many Requests)
  // ✅ OTIMIZAÇÃO: Queries críticas carregam primeiro, não-críticas depois
  const servicesQuery = trpc.store.getServices.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 7 * 60 * 1000, // 7 minutes
  });
  const countriesQuery = trpc.store.getCountries.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  const pricesQuery = trpc.store.getPrices.useQuery({}, {
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
    // ✅ Carregar preços apenas após serviços e países estarem prontos
    enabled: !!servicesQuery.data && !!countriesQuery.data,
  });
  const operatorsQuery = trpc.store.getOperators.useQuery(
    { countryId: selectedCountry || undefined },
    {
      refetchOnWindowFocus: false,
      staleTime: 7 * 60 * 1000, // 7 minutes
      // ✅ Carregar operadoras apenas após país ser selecionado
      enabled: !!selectedCountry,
    }
  );

  // ✅ REMOVIDO: customerQuery (agora centralizado no StoreAuthContext)
  // Usar customer do contexto diretamente
  
  const favoritesQuery = trpc.store.getFavorites.useQuery(
    { customerId: customer?.id || 0 },
    { 
      // ✅ Carregar favoritos apenas se autenticado E após serviços estarem prontos
      enabled: !!customer?.id && !!servicesQuery.data,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000, // 1 minute
    }
  );

  // Query para verificar se o Programa de Afiliados está ativo
  const affiliateProgramQuery = trpc.affiliate.getProgramInfo.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query para verificar se está em modo de impersonação
  const impersonationQuery = trpc.impersonation.getCurrentSession.useQuery(undefined, {
    refetchInterval: 30000, // Check every 30 seconds
    refetchOnWindowFocus: false,
    staleTime: 25000,
  });
  const isImpersonating = impersonationQuery.data?.isImpersonating || false;
  
  // ✅ REMOVIDO: Query duplicada - será carregada apenas na página específica (StoreCatalog)
  // const activationsQuery = trpc.store.getMyActivations.useQuery(...)
  
  const utils = trpc.useUtils();

  // ✅ REMOVIDO: SSE duplicado (agora centralizado no StoreAuthContext)
  // ✅ REMOVIDO: notificationsQuery (agora centralizado no StoreAuthContext)
  // Notificações vem do contexto

  // ✅ Escutar notificações do contexto apenas para UI (toasts e sons)
  // Invalidações de queries já são feitas no StoreAuthContext
  useEffect(() => {
    if (lastNotification) {
      // Create unique notification ID based on type, timestamp, and data
      const notificationId = `${lastNotification.type}-${lastNotification.timestamp || Date.now()}-${JSON.stringify(lastNotification.data || {})}`;
      
      // Check if this notification was already displayed
      if (displayedNotifications.current.has(notificationId)) {
        return; // Skip already displayed notifications
      }
      
      // Purchase completion notification - apenas UI
      if (lastNotification.type === 'operation_completed' && lastNotification.data?.operation === 'purchase') {
        const now = Date.now();
        if (now - lastPurchaseNotification.current < 2000) {
          return; // Debounce
        }
        lastPurchaseNotification.current = now;
        
        // Mark this notification as displayed (persist in localStorage)
        displayedNotifications.current.add(notificationId);
        try {
          const stored = localStorage.getItem('displayed_notifications');
          const notifications = stored ? JSON.parse(stored) : [];
          notifications.push({ id: notificationId, timestamp: now });
          // Manter apenas últimas 100 notificações
          const recent = notifications.slice(-100);
          localStorage.setItem('displayed_notifications', JSON.stringify(recent));
        } catch (e) {
          console.error('Error saving displayed notification:', e);
        }
        
        toast.success(lastNotification.title || 'Compra realizada', {
          description: lastNotification.message || 'Número SMS adquirido com sucesso',
          duration: 5000,
        });
        playNotificationSound('purchase');
      }
    }
  }, [lastNotification]);
  
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

  // ✅ REMOVIDO: Detecção de novos SMS codes (agora feita via SSE no StoreAuthContext)
  // Notificações de SMS são enviadas via SSE, não precisamos mais fazer polling

  const formatBalance = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;

  // Construir mapa de preços por (serviceId, countryId)
  const priceMap = new Map<string, number>();
  
  pricesQuery.data?.forEach((item: any) => {
    const key = `${item.service?.id}-${item.country?.id}`;
    
    // Calculate minimum price from all API options
    const minPrice = item.apiOptions?.reduce((min: number, opt: any) => {
      const price = opt.price || 0;
      return price < min ? price : min;
    }, Infinity) || 0;
    
    priceMap.set(key, minPrice === Infinity ? 0 : minPrice);
  });
  
  // Usar servicesQuery como base (já vem ordenado do backend: top 20 por vendas + alfabética)
  // Filtrar apenas serviços que têm preço para o país selecionado
  const availableServices = (servicesQuery.data || [])
    .map((service: any) => {
      const key = `${service.id}-${selectedCountry || 1}`;
      const price = priceMap.get(key) || 0;
      
      // Só incluir se tiver preço disponível
      if (price === 0) return null;
      
      return {
        id: service.id,
        name: service.name,
        price,
        countryId: selectedCountry || 1,
        key,
        isNew: service.isNew,
      };
    })
    .filter((s: any) => s !== null);

  // Get favorite service IDs (only if authenticated)
  const favoriteServiceIds = new Set(favoritesQuery.data?.map((f: any) => f.serviceId) || []);

  // Filter services
  const filteredServices = availableServices.filter((service: any) => {
    const matchesSearch = service.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = !selectedCountry || service.countryId === selectedCountry;
    const matchesFavorites = !showFavorites || favoriteServiceIds.has(service.id);
    return matchesSearch && matchesCountry && matchesFavorites;
  });

  const handleToggleFavorite = (serviceId: number) => {
    requireAuth(() => {
      if (!customer?.id) return;
      toggleFavoriteMutation.mutate({ customerId: customer.id, serviceId });
    });
  };

  // ✅ DEBOUNCE: Prevenir cliques duplos no botão de compra
  const handleBuyServiceInternal = async (service: any, apiId?: number) => {
    requireAuth(async () => {
      // Prevenir múltiplas compras simultâneas (local ou de outros navegadores)
      if (isPurchasing || isLocked) {
        if (isLocked) {
          toast.warning('Aguarde', {
            description: 'Uma operação já está em andamento em outro dispositivo',
          });
        }
        return;
      }
      
      // Check balance first
      const currentBalance = customer?.balance || 0;
      if (currentBalance < service.price) {
        toast.error('Saldo insuficiente', {
          description: `Você precisa de ${formatBalance(service.price)}, mas tem apenas ${formatBalance(currentBalance)}`,
        });
        return;
      }

      // Ativar estado global de compra
      setIsPurchasing(true);
      setBuyingServiceKey(service.key);
      if (apiId) {
        setLoadingApiId(apiId);
      }
      
      // Executar compra e mostrar notificação de sucesso/erro
      (async () => {
        try {
          // Executar compra com delay mínimo de 4 segundos
          await Promise.all([
            purchaseMutation.mutateAsync({
              customerId: customer!.id,
              countryId: service.countryId,
              serviceId: service.id,
              operator: selectedOperator !== 'any' ? selectedOperator : undefined,
              apiId, // Pass API ID if provided
            }),
            new Promise(resolve => setTimeout(resolve, 4000)) // Delay mínimo de 4 segundos
          ]);
          
          // Mostrar notificação de SUCESSO (igual ao cancelamento)
          toast.success('Número SMS adquirido com sucesso!');
          
          // Invalidate queries to refresh data
          await utils.store.getCustomer.invalidate();
          await utils.store.getMyActivations.invalidate();
        } catch (error: any) {
          // Mostrar apenas notificações de ERRO (5 segundos para mensagens longas)
          toast.error(error.message, {
            duration: 5000,
          });
        } finally {
          // Desativar estado global de compra após conclusão
          setIsPurchasing(false);
          setBuyingServiceKey(null);
          setLoadingApiId(null);
        }
      })();
    });
  };
  
  // Aplicar debounce de 1 segundo para prevenir cliques duplos
  const handleBuyService = useDebouncedCallback(handleBuyServiceInternal, 1000);

  const handleRecharge = () => {
    requireAuth(() => {
      setRechargeModalOpen(true);
    });
  };

  const handleProfile = () => {
    requireAuth(() => {
      setLocation('/account');
    });
  };

  const handleHistory = () => {
    requireAuth(() => {
      setLocation('/history');
    });
  };

  const isActive = (path: string) => location === path;

  // Display balance (R$ 0,00 if not authenticated)
  const displayBalance = isAuthenticated 
    ? (customer?.balance || 0)
    : 0;
  
  // Animated balance with counter effect
  const animatedBalance = useCountUp(displayBalance, 800);
  
  // Detect balance changes and trigger flash animation
  useEffect(() => {
    if (previousBalance.current !== null && previousBalance.current !== displayBalance) {
      const diff = displayBalance - previousBalance.current;
      if (diff > 0) {
        // Balance increased (green flash)
        setBalanceFlash('green');
        setTimeout(() => setBalanceFlash(null), 800);
      } else if (diff < 0) {
        // Balance decreased (red flash)
        setBalanceFlash('red');
        setTimeout(() => setBalanceFlash(null), 800);
      }
    }
    previousBalance.current = displayBalance;
  }, [displayBalance]);
  
  // Check if balance is low (< R$ 7,00 = 700 centavos) AND user is authenticated
  // Only show red when user is logged in AND balance is low
  const isLowBalance = isAuthenticated && displayBalance < 700;

  // Estado para a linha de scan animada
  const [scanLine, setScanLine] = useState(0);

  // Animar a linha de scan apenas quando usuário NÃO estiver logado
  useEffect(() => {
    if (isAuthenticated) {
      // Se usuário está logado, não animar
      return;
    }
    
    const interval = setInterval(() => {
      setScanLine(prev => (prev >= 100 ? 0 : prev + 0.5));
    }, 50);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <div className="bg-gradient-to-br from-slate-950 via-zinc-950 to-slate-950 text-green-400 font-mono">
      {/* Impersonation Banner */}
      <ImpersonationBanner />

      {/* Camada de Background Animado - Fixo na tela */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        
        {/* 1. Grid Cyber (Linhas Verdes) */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(34, 197, 94, 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(34, 197, 94, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* 2. Linha de Scan Animada (Efeito Matrix) - Apenas para usuários não logados */}
        {!isAuthenticated && (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, transparent ${scanLine}%, rgba(34, 197, 94, 0.1) ${scanLine + 1}%, transparent ${scanLine + 2}%)`
            }}
          />
        )}
        
        {/* 3. Glows Radiais (Efeitos de Luz Verde) */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className={`fixed left-0 right-0 h-16 bg-black border-b border-green-900/50 z-50 flex items-center justify-between px-4 md:px-6 transition-all duration-300 ${
        isImpersonating ? 'top-[60px]' : 'top-0'
      }`}>
        <div className="flex items-center gap-2 md:gap-8">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-green-600 hover:text-green-400"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>

          {/* Text "Menu" next to icon - Mobile only */}
          <span className="lg:hidden text-green-400 font-medium">Menu</span>

          <button 
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 text-lg md:text-xl font-bold"
          >
            {/* Logo N - SVG inline com fundo transparente */}
            <svg 
              className="hidden sm:block w-8 h-8" 
              viewBox="0 0 100 100" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="100" height="100" rx="12" fill="#00D26A"/>
              <text 
                x="50" 
                y="50" 
                fontSize="60" 
                fontWeight="bold" 
                fontFamily="sans-serif" 
                fill="#000000" 
                textAnchor="middle" 
                dominantBaseline="central"
              >
                N
              </text>
            </svg>
            <span className="text-green-400 hidden sm:inline">Número Virtual</span>
          </button>

          <nav className="hidden lg:flex items-center gap-2">
            <Button
              onClick={() => setLocation('/')}
              variant="ghost"
              className={`${isActive('/') ? 'bg-green-500 text-black hover:bg-green-500 hover:brightness-110' : 'text-green-600 hover:text-green-400 hover:bg-green-900/20'} font-mono flex items-center gap-2`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Button>
            {isAuthenticated && (
              <Button
                onClick={handleHistory}
                variant="ghost"
                className={`${isActive('/history') ? 'bg-green-500 text-black hover:bg-green-500 hover:brightness-110' : 'text-green-600 hover:text-green-400 hover:bg-green-900/20'} font-mono flex items-center gap-2`}
              >
                <History className="w-4 h-4" />
                Histórico
              </Button>
            )}
            {isAuthenticated && affiliateProgramQuery.data?.isActive && (
              <Button
                onClick={() => setLocation('/affiliate')}
                variant="ghost"
                className={`${isActive('/affiliate') ? 'bg-green-500 text-black hover:bg-green-500 hover:brightness-110' : 'text-green-600 hover:text-green-400 hover:bg-green-900/20'} font-mono flex items-center gap-2`}
              >
                <Gift className="w-4 h-4" />
                Afiliados
              </Button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile Balance Display */}
          {isAuthenticated && (
            <button 
              onClick={handleRecharge}
              className={`lg:hidden flex items-center gap-1.5 px-2 py-1 rounded transition-colors cursor-pointer ${
                isLowBalance 
                  ? 'bg-red-900/20 border border-red-900/50 hover:bg-red-900/30 hover:border-red-500/50 animate-pulse' 
                  : 'bg-green-900/20 border border-green-900/50 hover:bg-green-900/30 hover:border-green-500/50'
              } ${
                balanceFlash === 'green' ? 'balance-flash-green' : balanceFlash === 'red' ? 'balance-flash-red' : ''
              }`}
            >
              <Wallet className={`w-4 h-4 ${isLowBalance ? 'text-red-600' : 'text-green-600'}`} />
              <span className={`font-bold text-sm ${isLowBalance ? 'text-red-400' : 'text-green-400'}`}>
                {formatBalance(Math.round(animatedBalance))}
              </span>
            </button>
          )}

          {/* ID Display (only if authenticated and desktop) */}
          {isAuthenticated && customer && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-900/20 border border-green-900/50 rounded">
              <span className="text-green-600 text-sm">ID:</span>
              <span className="text-green-400 font-bold">#{customer.pin}</span>
              <button
                onClick={async () => {
                  await copyToClipboard(customer.pin.toString());
                  toast.success('ID copiado!');
                }}
                className="text-green-600 hover:text-green-400 transition-colors p-1"
                title="Copiar ID"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Admin Panel Button - Responsive */}
          {customer?.role === 'admin' && (
            <Button
              onClick={() => {
                window.location.href = '/admin';
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold flex items-center gap-2 lg:px-4 lg:py-2 px-3 py-2 h-9 lg:h-10"
            >
              <Shield className="w-4 h-4" />
              <span className="text-xs sm:text-sm lg:text-base">Painel Admin</span>
            </Button>
          )}

          {/* Language Selector Dropdown (hidden on mobile) */}

          {/* Profile Menu Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              {customer?.role === 'admin' ? (
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-green-900/20 transition-colors border border-black focus:outline-none focus-visible:outline-none">
                  <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-purple-500" />
                  </div>
                  <span className="text-sm font-medium text-purple-400 hidden sm:block">Admin</span>
                </button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-green-600 hover:text-green-400" style={{width: '40px', height: '40px'}}
                >
                  <User className="w-5 h-5" />
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black border-green-900/50">
              {/* Mostrar Perfil e Sair quando logado, apenas Entrar quando deslogado */}
              {isAuthenticated && (
                <>
                  <DropdownMenuItem 
                    onClick={() => setLocation('/account')}
                    className="text-green-400 hover:text-green-300 hover:bg-green-900/20 cursor-pointer"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation('/recharges')}
                    className="text-green-400 hover:text-green-300 hover:bg-green-900/20 cursor-pointer"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Recargas
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation('/')}
                    className="lg:hidden text-green-400 hover:text-green-300 hover:bg-green-900/20 cursor-pointer"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleHistory}
                    className="lg:hidden text-green-400 hover:text-green-300 hover:bg-green-900/20 cursor-pointer"
                  >
                    <History className="w-4 h-4 mr-2" />
                    Histórico
                  </DropdownMenuItem>

                  {affiliateProgramQuery.data?.isActive && (
                    <DropdownMenuItem 
                      onClick={() => setLocation('/affiliate')}
                      className="lg:hidden text-green-400 hover:text-green-300 hover:bg-green-900/20 cursor-pointer"
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Afiliados
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {isAuthenticated ? (
                <DropdownMenuItem 
                  onClick={() => {
                    logout(); // Limpa estado do contexto e localStorage
                    toast.success('Logout realizado com sucesso!');
                    setLocation('/'); // Redireciona para página inicial
                  }}
                  className="text-green-400 hover:text-green-300 hover:bg-green-900/20 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  onClick={() => {
                    // Abre modal de login usando requireAuth com ação vazia
                    requireAuth(() => {});
                  }}
                  className="text-green-400 hover:text-green-300 hover:bg-green-900/20 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 bottom-0 w-[364px] bg-black border-r border-green-900/50 overflow-y-auto z-40 transition-all duration-300 ${
        isImpersonating ? 'top-[124px]' : 'top-16'
      } ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-4 space-y-4">
          {/* Balance Card */}
          <div className={`hidden lg:block rounded-lg p-4 bg-black border relative overflow-hidden ${
            isLowBalance ? 'border-red-500 animate-pulse' : 'border-green-900/30'
          } ${
            balanceFlash === 'green' ? 'balance-flash-green' : balanceFlash === 'red' ? 'balance-flash-red' : ''
          }`} style={{borderWidth: '2px'}}>
            {/* Grid cyber background */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: `
                linear-gradient(to right, ${isLowBalance ? '#ef4444' : '#22c55e'} 1px, transparent 1px),
                linear-gradient(to bottom, ${isLowBalance ? '#ef4444' : '#22c55e'} 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              opacity: 0.05
            }} />
            
            {/* Header gradient */}
            <div className={`absolute top-0 left-0 right-0 h-16 bg-gradient-to-b pointer-events-none ${
              isLowBalance ? 'from-red-950/50' : 'from-green-950/50'
            } to-transparent`} />
            
            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wallet className={`w-5 h-5 ${isLowBalance ? 'text-red-400' : 'text-green-400'}`} />
                  <span className={`text-sm font-bold ${isLowBalance ? 'text-red-400' : 'text-green-400'}`}>Saldo</span>
                </div>
                {isLowBalance ? (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className={`text-3xl font-bold mb-3 font-mono ${
                isLowBalance ? 'text-red-400' : 'text-green-400'
              }`}>
                {formatBalance(Math.round(animatedBalance))}
              </div>
              <Button
                onClick={handleRecharge}
                className={`w-full font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  isLowBalance 
                    ? 'bg-red-500 hover:bg-red-400 border-red-400 text-black' 
                    : 'bg-green-500 hover:bg-green-600 text-black'
                }`}
              >
                Recarregar
              </Button>
            </div>
          </div>



          {/* Country Filter */}
          <div>
            <label className="flex items-center gap-2 text-sm text-green-600 mb-2">
              <Globe className="w-4 h-4" />
              Selecione o País
            </label>
            <select
              value={selectedCountry || ''}
              onChange={(e) => setSelectedCountry(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-gray-900 border border-green-900/50 rounded px-3 py-2 text-green-400 font-mono focus:outline-none focus:border-green-500"
            >
              {countriesQuery.data?.map((country: any) => (
                <option key={country.id} value={country.id}>
                  {country.name} ({country.code})
                </option>
              ))}
            </select>
          </div>

          {/* Operator Filter */}
          <div>
            <label className="text-sm text-green-600 mb-2 block">
              Operadora <span className="text-xs">(opcional)</span>
            </label>
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="w-full bg-gray-900 border border-green-900/50 rounded px-3 py-2 text-green-600 font-mono hover:border-green-700 transition-colors"
            >
              <option value="any">Aleatória</option>
              {operatorsQuery.data?.filter((op: any) => op.code !== 'any').map((operator: any) => (
                <option key={operator.id} value={operator.code}>
                  {operator.name}
                </option>
              ))}
            </select>
          </div>

          {/* Service Search */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-green-600"></label>
              {isAuthenticated && (
                <label className="flex items-center gap-2 text-xs text-green-600 cursor-pointer">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={showFavorites}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setShowFavorites(newValue);
                        localStorage.setItem('store_show_favorites', String(newValue));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 border-2 border-green-500 rounded bg-transparent peer-checked:bg-green-500 peer-checked:border-green-500 transition-all duration-200 flex items-center justify-center" style={{width: '14px', height: '14px'}}>
                      {showFavorites && (
                        <Check className="w-3 h-3 text-black" />
                      )}
                    </div>
                  </div>
                  Exibir favoritos
                </label>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar serviços"
                className="w-full bg-gray-900 border-green-900/50 pl-10 text-green-400 font-mono focus-visible:ring-2 focus-visible:ring-green-500/50 focus-visible:ring-offset-0 focus-visible:border-green-900/50"
              />
            </div>
          </div>

          {/* Services List */}
          <div className="space-y-2">
            {servicesQuery.isLoading ? (
              <ServiceListSkeleton count={8} />
            ) : filteredServices.length === 0 ? (
              <p className="text-center text-green-600 text-sm py-4">
                Nenhum serviço encontrado
              </p>
            ) : (
              filteredServices.map((service: any) => {
              const isExpanded = expandedServices.has(service.id);
              const isLoading = buyingServiceKey === service.key;
              
              return (
                <div key={service.key} className="bg-gray-900 border border-green-900/50 rounded overflow-hidden">
                  {/* Service Header */}
                  <div 
                    onClick={() => {
                      setExpandedServices(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(service.id)) {
                          newSet.delete(service.id);
                        } else {
                          newSet.add(service.id);
                        }
                        return newSet;
                      });
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-green-900/10 hover:border-green-500/50 transition-colors cursor-pointer"
                  >
                    {isAuthenticated && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(service.id);
                        }}
                        className="text-green-600 hover:text-green-400 transition-colors"
                      >
                        <Star 
                          className="w-4 h-4" 
                          fill={favoriteServiceIds.has(service.id) ? 'currentColor' : 'none'}
                        />
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-black font-bold">
                          {service.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-green-400 font-bold text-sm truncate">{service.name}</p>
                            {service.isNew && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-500 rounded text-green-400 text-xs font-bold">
                                <Sparkles className="w-3 h-3" />
                                Novo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-green-400 flex items-center justify-center">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Dropdown with API Options */}
                  {isExpanded && (
                    <div className="border-t border-green-900/50 bg-black/50 p-3 space-y-2">
                      <ServiceApiOptions 
                        serviceId={service.id} 
                        countryId={selectedCountry || 1}
                        customerId={customer?.id} // Passar ID do cliente para adaptar UX
                        loadingApiId={loadingApiId}
                        isPurchasing={isPurchasing}
                        isLocked={isLocked}
                        onBuy={(apiId: number, apiName: string, price: number) => {
                          // Create service object with updated price from selected API
                          const serviceWithApiPrice = {
                            ...service,
                            price, // Use price from selected API
                          };
                          handleBuyService(serviceWithApiPrice, apiId);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 lg:ml-[364px] p-4 md:p-8 ${isAuthenticated ? 'overflow-y-auto' : 'overflow-y-hidden'} transition-all duration-300 ${
        isImpersonating ? 'mt-[124px] h-[calc(100vh-124px)]' : 'mt-16 h-[calc(100vh-4rem)]'
      }`} style={{paddingTop: '0px', paddingBottom: '36px'}}>
        <div className="relative z-10">
          {children}
        </div>
      </main>

      {/* Recharge Modal */}
      <RechargeModal 
        isOpen={rechargeModalOpen} 
        onClose={() => setRechargeModalOpen(false)} 
      />


    </div>
  );
}
