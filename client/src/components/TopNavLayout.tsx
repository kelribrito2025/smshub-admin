import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLoginUrl } from "@/const";
import { LayoutDashboard, LogOut, Settings, ChevronDown, LucideIcon, Shield } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';

// Helper function to get icon component from string name
function getIconComponent(iconName: string | null): LucideIcon {
  if (!iconName) return LayoutDashboard;
  const IconComponent = (LucideIcons as any)[iconName];
  return IconComponent || LayoutDashboard;
}

export default function TopNavLayout({
  children,
  breadcrumbs,
}: {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}) {
  const { loading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const logoutMutation = trpc.auth.logout.useMutation();

  // Fetch menu items from database
  const { data: dbMenus, isLoading: menusLoading } = trpc.adminMenus.getAll.useQuery();

  // Fallback menu items (used if database menus are not available)
  const fallbackMenuItems = [
    { icon: "LayoutDashboard", label: "Dashboard", path: "/admin/dashboard" },
    { icon: "LineChart", label: "Relatórios", path: "/admin/relatorios" },
    { icon: "FileText", label: "Auditoria de Saldo", path: "/admin/auditoria" },
    { icon: "Settings", label: "Configurações", path: "/admin/settings" },
    { icon: "Cloud", label: "APIs", path: "/admin/apis" },
    { icon: "BarChart3", label: "Performance de APIs", path: "/admin/api-performance" },
    { icon: "Globe", label: "Países", path: "/admin/countries" },
    { icon: "BookOpen", label: "Catálogo", path: "/admin/catalogo" },
    { icon: "Users", label: "Clientes", path: "/admin/clientes" },
    { icon: "Gift", label: "Afiliados", path: "/admin/affiliates" },
  ];

  const menuItems = dbMenus && dbMenus.length > 0
    ? dbMenus.map((menu: any) => ({
        icon: menu.icon || "LayoutDashboard",
        label: menu.label,
        path: menu.path,
      }))
    : fallbackMenuItems;

  const visibleItems = menuItems.slice(0, 6);
  const moreItems = menuItems.slice(6);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = getLoginUrl();
  };

  if (loading || menusLoading) {
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
            onClick={() => (window.location.href = getLoginUrl())}
            size="lg"
            className="w-full"
          >
            Continue to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950">
      {/* Top Navigation Bar */}
      <div className="w-full bg-neutral-950 border-b border-neutral-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3">
              <LayoutDashboard size={24} className="text-blue-500" />
              <h1 className="text-lg font-medium text-white">Número Virtual</h1>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              {visibleItems.map((item: any) => {
                const Icon = getIconComponent(item.icon);
                const isActive = location === item.path;

                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-blue-500' : ''} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}

              {/* More menu */}
              {moreItems.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
                  >
                    <span className="text-sm">Mais</span>
                    <ChevronDown size={16} />
                  </button>

                  {showMoreMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowMoreMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50">
                        {moreItems.map((item: any) => {
                          const Icon = getIconComponent(item.icon);
                          const isActive = location === item.path;

                          return (
                            <button
                              key={item.path}
                              onClick={() => {
                                setLocation(item.path);
                                setShowMoreMenu(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                                isActive ? 'text-white' : 'text-neutral-400'
                              }`}
                            >
                              <Icon size={18} className={isActive ? 'text-blue-500' : ''} />
                              <span className="text-sm">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </nav>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="w-10 h-10 bg-neutral-900 rounded-full flex items-center justify-center border-2 border-neutral-800">
                    <Shield size={20} className="text-blue-500" strokeWidth={2} />
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-sm font-medium text-white">{user.name || 'Admin'}</div>
                    <div className="text-xs text-neutral-500">{user.email}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setLocation('/admin/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="border-b border-neutral-800 bg-neutral-950/50 px-6 py-3">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
