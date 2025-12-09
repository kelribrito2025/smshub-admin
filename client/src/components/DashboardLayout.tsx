import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Settings, RefreshCw, Globe, Package, Key, LineChart, Users, BookOpen, Cloud, BarChart3, CreditCard, FileText, Gift, GripVertical, LucideIcon, Shield, Bell } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

// Set admin page title
if (typeof document !== 'undefined') {
  document.title = 'Admin - Número Virtual';
}
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { MenuReorderDialog } from "./MenuReorderDialog";
import NotificationsSidebar from './NotificationsSidebar';

// Fallback menu items (used if database menus are not available)
const fallbackMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: LineChart, label: "Relatórios", path: "/admin/relatorios" },
  { icon: FileText, label: "Auditoria de Saldo", path: "/admin/auditoria" },
  { icon: Settings, label: "Configurações", path: "/admin/settings" },
  { icon: CreditCard, label: "Pagamentos", path: "/admin/payment-settings" },
  { icon: Cloud, label: "APIs", path: "/admin/apis" },
  { icon: BarChart3, label: "Performance de APIs", path: "/admin/api-performance" },
  { icon: Globe, label: "Países", path: "/admin/countries" },
  { icon: BookOpen, label: "Catálogo", path: "/admin/catalogo" },
  { icon: Users, label: "Clientes", path: "/admin/clientes" },
  { icon: Gift, label: "Afiliados", path: "/admin/affiliates" },
];

// Helper function to get icon component from string name
function getIconComponent(iconName: string | null): LucideIcon {
  if (!iconName) return LayoutDashboard;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent || LayoutDashboard;
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';

export default function DashboardLayout({
  children,
  breadcrumbs,
}: {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth} breadcrumbs={breadcrumbs}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  breadcrumbs?: BreadcrumbItem[];
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  breadcrumbs,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [notificationsSidebarOpen, setNotificationsSidebarOpen] = useState(false);

  // Query notifications to get unread count for badge
  // Configuração otimizada para atualização imediata:
  // - staleTime: 0 → sempre revalida ao montar componente
  // - refetchInterval: 10s → polling mais agressivo
  // - refetchOnWindowFocus: true → atualiza ao focar aba
  const notificationsQuery = trpc.notifications.getAll.useQuery(undefined, {
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    staleTime: 0,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const unreadCount = (notificationsQuery.data || []).filter(n => !n.isRead).length;

  // Fetch menus from database
  const { data: dbMenus } = trpc.adminMenus.getAll.useQuery();

  // Convert database menus to menu items with icons
  const menuItems = dbMenus
    ? dbMenus.map(menu => ({
        icon: getIconComponent(menu.icon),
        label: menu.label,
        path: menu.path,
      }))
    : fallbackMenuItems;

  const activeMenuItem = menuItems.find(item => item.path === location);

  // Refetch notificações ao navegar entre páginas
  // Garante atualização instantânea do badge ao trocar de rota
  useEffect(() => {
    if (user?.id) {
      notificationsQuery.refetch();
    }
  }, [location]); // Dispara sempre que a rota mudar

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">
                    Navigation
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            {/* Notifications button - desktop */}
            {!isMobile && (
              <Button
                variant="ghost"
                onClick={() => setNotificationsSidebarOpen(true)}
                className="relative w-full justify-start mb-2 h-10"
              >
                <Bell className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">Notificações</span>
                {unreadCount > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1 group-data-[collapsible=icon]:right-1 group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:w-2 group-data-[collapsible=icon]:h-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:animate-pulse">
                    <span className="group-data-[collapsible=icon]:hidden">{unreadCount}</span>
                  </span>
                )}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {user?.role === 'admin' ? (
                    <>
                      <div className="h-9 w-9 border shrink-0 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                        <p className="text-sm font-medium truncate leading-none">
                          Admin
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-1.5">
                          {user?.email || "-"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Avatar className="h-9 w-9 border shrink-0">
                        <AvatarFallback className="text-xs font-medium">
                          {user?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                        <p className="text-sm font-medium truncate leading-none">
                          {user?.name || "-"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-1.5">
                          {user?.email || "-"}
                        </p>
                      </div>
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setReorderDialogOpen(true)}
                  className="cursor-pointer"
                >
                  <GripVertical className="mr-2 h-4 w-4" />
                  <span>Reorganizar Menus</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotificationsSidebarOpen(true)}
              className="relative h-9 w-9"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </Button>
          </div>
        )}
        <main className="flex-1 p-4">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs items={breadcrumbs} />
          )}
          {children}
        </main>
      </SidebarInset>

      <MenuReorderDialog
        open={reorderDialogOpen}
        onOpenChange={setReorderDialogOpen}
      />

      <NotificationsSidebar
        isOpen={notificationsSidebarOpen}
        onClose={() => setNotificationsSidebarOpen(false)}
      />
    </>
  );
}
