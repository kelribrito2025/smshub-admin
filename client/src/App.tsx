import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { StoreAuthProvider } from "./contexts/StoreAuthContext";

// Lazy load all pages for code splitting
const NotFound = lazy(() => import("@/pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Countries = lazy(() => import("./pages/Countries"));
const Financial = lazy(() => import("./pages/Financial"));
const Customers = lazy(() => import("./pages/Customers"));
const Catalog = lazy(() => import("./pages/Catalog"));
const Apis = lazy(() => import("./pages/admin/Apis"));
const ApiPerformance = lazy(() => import("./pages/admin/ApiPerformance"));
const PaymentSettings = lazy(() => import("./pages/PaymentSettings"));
const Audit = lazy(() => import("./pages/Audit"));
const Affiliates = lazy(() => import("./pages/admin/Affiliates"));

// Store pages (public)
const StoreCatalog = lazy(() => import("./pages/StoreCatalog"));
const StoreActivations = lazy(() => import("./pages/StoreActivations"));
const StoreAccount = lazy(() => import("./pages/StoreAccount"));

const StoreAffiliate = lazy(() => import("./pages/StoreAffiliate"));
const StoreRecharges = lazy(() => import("./pages/StoreRecharges"));

const LoadingFallback = () => (
  <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center z-50">
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
      </div>
      <div className="text-slate-400 text-sm font-medium animate-pulse">
        Carregando...
      </div>
    </div>
  </div>
);

// Router para rotas do painel de vendas (COM StoreAuthProvider)
function StoreRouter() {
  return (
    <StoreAuthProvider>
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          <Route path={"/"} component={StoreCatalog} />
          <Route path="/history" component={StoreActivations} />
          <Route path="/account" component={StoreAccount} />

          <Route path="/affiliate" component={StoreAffiliate} />
          <Route path="/recharges" component={StoreRecharges} />
        </Switch>
      </Suspense>
    </StoreAuthProvider>
  );
}

// Router para rotas admin (SEM StoreAuthProvider)
function AdminRouter() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path={"/admin"} component={Dashboard} />
        <Route path={"/admin/dashboard"} component={Dashboard} />
        <Route path={"/admin/settings"} component={Settings} />
        <Route path={"/admin/countries"} component={Countries} />
        <Route path="/admin/relatorios" component={Financial} />
        <Route path="/admin/clientes" component={Customers} />
        <Route path={"/admin/catalogo"} component={Catalog} />
        <Route path={"/admin/apis"} component={Apis} />
        <Route path="/admin/api-performance" component={ApiPerformance} />
        <Route path="/admin/payment-settings" component={PaymentSettings} />
        <Route path="/admin/auditoria" component={Audit} />
        <Route path="/admin/affiliates" component={Affiliates} />
      </Switch>
    </Suspense>
  );
}

// Router principal que decide qual sub-router usar
function MainRouter() {
  const [location] = useLocation();
  
  // Se a rota começa com /admin, usa AdminRouter (sem StoreAuthProvider)
  if (location.startsWith('/admin')) {
    return <AdminRouter />;
  }
  
  // Caso contrário, usa StoreRouter (com StoreAuthProvider)
  return <StoreRouter />;
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <Toaster duration={2300} closeButton={false} visibleToasts={1} />
        <TooltipProvider>
          <MainRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
