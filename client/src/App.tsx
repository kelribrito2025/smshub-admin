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
import WebhookSetup from "./pages/WebhookSetup";
import Affiliates from "./pages/admin/Affiliates";
import { StoreAuthProvider } from "./contexts/StoreAuthContext";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/settings"} component={Settings} />

      <Route path={"/countries"} component={Countries} />
      <Route path="/relatorios" component={Financial} />
      <Route path="/clientes" component={Customers} />
      <Route path={"/catalogo"} component={Catalog} />
      <Route path={"/apis"} component={Apis} />
      <Route path="/api-performance" component={ApiPerformance} />
      <Route path="/payment-settings" component={PaymentSettings} />
      <Route path="/auditoria" component={Audit} />
            <Route path="/store" component={StoreCatalog} />
      <Route path="/store/history" component={StoreActivations} />
      <Route path="/store/account" component={StoreAccount} />
      <Route path="/store/security" component={StoreSecurity} />
      <Route path="/store/settings" component={StoreSettings} />
      <Route path="/store/affiliate" component={StoreAffiliate} />
      <Route path="/store/recharges" component={StoreRecharges} />
      <Route path="/webhook-setup" component={WebhookSetup} />
      <Route path="/affiliates" component={Affiliates} />
      
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
        <Toaster />
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
