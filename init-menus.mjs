import { drizzle } from "drizzle-orm/mysql2";
import { adminMenus } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const defaultMenus = [
  { label: "Dashboard", path: "/dashboard", icon: "LayoutDashboard", position: 1 },
  { label: "Relatórios", path: "/relatorios", icon: "LineChart", position: 2 },
  { label: "Auditoria de Saldo", path: "/auditoria", icon: "FileText", position: 3 },
  { label: "Configurações", path: "/settings", icon: "Settings", position: 4 },
  { label: "Pagamentos", path: "/payment-settings", icon: "CreditCard", position: 5 },
  { label: "APIs", path: "/apis", icon: "Cloud", position: 6 },
  { label: "Performance de APIs", path: "/api-performance", icon: "BarChart3", position: 7 },
  { label: "Países", path: "/countries", icon: "Globe", position: 8 },
  { label: "Catálogo", path: "/catalogo", icon: "BookOpen", position: 9 },
  { label: "Clientes", path: "/clientes", icon: "Users", position: 10 },
  { label: "Afiliados", path: "/affiliates", icon: "Gift", position: 11 },
];

try {
  // Check if menus already exist
  const existing = await db.select().from(adminMenus).limit(1);
  
  if (existing.length > 0) {
    console.log("Menus already initialized");
  } else {
    await db.insert(adminMenus).values(defaultMenus);
    console.log("Default menus initialized successfully");
  }
} catch (error) {
  console.error("Error initializing menus:", error);
  process.exit(1);
}

process.exit(0);
