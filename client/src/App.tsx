import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";

import Countries from "./pages/Countries";
import Financial from "./pages/Financial";
import Customers from "./pages/Customers";
import Catalog from "./pages/Catalog";
import Apis from "./pages/admin/Apis";
import ApiPerformance from "./pages/admin/ApiPerformance";
import PaymentSettings from "./pages/PaymentSettings";
import Audit from "./pages/Audit";

import StoreCatalog from "./pages/StoreCatalog";
import StoreActivations from "./pages/StoreActivations";
import StoreAccount from "./pages/StoreAccount";
import StoreSecurity from "./pages/StoreSecurity";
import StoreSettings from "./pages/StoreSettings";
import StoreAffiliate from "./pages/StoreAffiliate";
import StoreRecharges from "./pages/StoreRecharges";


import Affiliates from "./pages/admin/Affiliates";
import { StoreAuthProvider } from "./contexts/StoreAuthContext";

function Router() {
  return (
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
