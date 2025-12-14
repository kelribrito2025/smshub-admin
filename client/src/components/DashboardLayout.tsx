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
import { LayoutDashboard, LogOut, PanelLeft, Settings, RefreshCw, Globe, Package, Key, LineChart, Users, BookOpen, Cloud, BarChart3, FileText, Gift, GripVertical, LucideIcon, Shield, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
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

// Fallback menu items (used if database menus are not available)
const fallbackMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: LineChart, label: "Relatórios", path: "/admin/relatorios" },
  { icon: FileText, label: "Auditoria de Saldo", path: "/admin/auditoria" },
  { icon: Settings, label: "Configurações", path: "/admin/settings" },

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
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  // Fetch menus from database (optimized to prevent 429)
  const { data: dbMenus } = trpc.adminMenus.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes (menus rarely change)
    refetchOnWindowFocus: false, // Don't refetch when switching tabs
    retry: 1, // Only 1 retry to prevent 429 errors
  });

  // Convert database menus to menu items with icons
  const menuItems = dbMenus
    ? dbMenus.map(menu => ({
        icon: getIconComponent(menu.icon),
        label: menu.label,
        path: menu.path,
      }))
    : fallbackMenuItems;

  const activeMenuItem = menuItems.find(item => item.path === location);



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
      <div className="relative font-sans" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 bg-neutral-950 border-neutral-800"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-neutral-800">
            <div className="flex items-center justify-between px-4 transition-all w-full">
              <div className="flex items-center gap-3 text-neutral-400">
                <PanelLeft className="h-6 w-6 text-white" />
                {!isCollapsed && <h2 className="text-lg font-medium text-white">Navegação</h2>}
              </div>
              <button
                onClick={toggleSidebar}
                className="text-neutral-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Toggle navigation"
              >
                {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              </button>
            </div>
          </SidebarHeader>

          <SidebarContent className={`gap-0 p-4 ${isCollapsed ? 'flex items-center' : ''}`}>
            <SidebarMenu className={`space-y-1 ${isCollapsed ? 'w-full flex flex-col items-center' : ''}`}>
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path} className="relative">
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLocation(item.path);
                        // Close mobile sidebar after navigation
                        if (isMobile) {
                          setOpenMobile(false);
                        }
                      }}
                      tooltip={isCollapsed ? item.label : undefined}
                      className={`h-11 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-neutral-900 text-white hover:bg-neutral-900'
                          : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                      } ${isCollapsed ? 'w-11 justify-center px-0' : 'px-4'}`}
                    >
                      <item.icon
                        className={`h-5 w-5 ${isActive ? 'text-blue-500' : ''}`}
                      />
                      <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-neutral-800 space-y-2">
            {/* User Profile with Dropdown Menu */}
            <DropdownMenu open={isAdminMenuOpen} onOpenChange={setIsAdminMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-neutral-900 transition-colors ${isCollapsed ? 'justify-center' : ''} focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <div className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center border-2 border-neutral-800 shrink-0">
                    <Shield className="h-6 w-6 text-purple-500" strokeWidth={2} />
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-medium text-white truncate">Admin</div>
                      <div className="text-xs text-neutral-500 truncate">{user?.email || "-"}</div>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side={isCollapsed ? "right" : "top"}
                align={isCollapsed ? "start" : "center"}
                className="w-56 bg-neutral-900 border-neutral-800 z-[100]"
                sideOffset={isCollapsed ? 8 : 4}
              >
                {/* User Info Header (only shown in dropdown when collapsed) */}
                {isCollapsed && (
                  <div className="px-2 py-2 border-b border-neutral-800">
                    <div className="text-sm font-medium text-white">Admin</div>
                    <div className="text-xs text-neutral-500 truncate">{user?.email || "-"}</div>
                  </div>
                )}
                
                {/* Configurações Button */}
                <DropdownMenuItem 
                  onClick={() => {
                    setLocation('/admin/settings');
                    setIsAdminMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-sm">Configurações</span>
                </DropdownMenuItem>

                {/* Reorganize Menus Button */}
                <DropdownMenuItem 
                  onClick={() => {
                    setReorderDialogOpen(true);
                    setIsAdminMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
                >
                  <GripVertical className="h-5 w-5" />
                  <span className="text-sm">Reorganizar Menus</span>
                </DropdownMenuItem>

                {/* Sign Out Button */}
                <DropdownMenuItem 
                  onClick={() => {
                    logout();
                    setIsAdminMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-red-500 hover:bg-neutral-800 hover:text-red-400 cursor-pointer"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm">Sign out</span>
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
        {/* Desktop Header - Always visible and fixed */}
        {!isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold tracking-tight text-foreground">
                {activeMenuItem?.label ?? "Painel admin"}
              </span>
            </div>
            <a href="https://app.numero-virtual.com" target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Painel de Vendas
              </Button>
            </a>
          </div>
        )}
        {/* Mobile Header - Always visible and fixed */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-50">
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
            <a href="https://app.numero-virtual.com" target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Painel de Vendas
              </Button>
            </a>
          </div>
        )}
        <main className="p-4 flex-shrink-0">
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
    </>
  );
}
