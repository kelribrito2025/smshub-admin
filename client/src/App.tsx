import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
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
const StoreSecurity = lazy(() => import("./pages/StoreSecurity"));
const StoreSettings = lazy(() => import("./pages/StoreSettings"));
const StoreAffiliate = lazy(() => import("./pages/StoreAffiliate"));
const StoreRecharges = lazy(() => import("./pages/StoreRecharges"));

function Router() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <Switch>
      {/* Painel de Vendas (Público) */}
      <Route path={"/"} component={StoreCatalog} />
      <Route path="/history" component={StoreActivations} />
      <Route path="/account" component={StoreAccount} />
      <Route path="/security" component={StoreSecurity} />
      <Route path="/settings" component={StoreSettings} />
      <Route path="/affiliate" component={StoreAffiliate} />
      <Route path="/recharges" component={StoreRecharges} />


      {/* Área Administrativa (Requer Login Manus) */}
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
      
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
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
          <StoreAuthProvider>
            <Router />
          </StoreAuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
