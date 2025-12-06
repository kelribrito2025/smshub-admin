import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./drizzle/schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não está definida");
  process.exit(1);
}

async function seedMenus() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: "default" });

  console.log("🌱 Iniciando seed de menus...");

  // Menus padrão do painel administrativo
  const defaultMenus = [
    { label: "Dashboard", path: "/", icon: "LayoutDashboard", position: 1 },
    { label: "Países", path: "/countries", icon: "Globe", position: 2 },
    { label: "Serviços", path: "/services", icon: "Package", position: 3 },
    { label: "Catálogo", path: "/catalog", icon: "BookOpen", position: 4 },
    { label: "Preços", path: "/prices", icon: "DollarSign", position: 5 },
    { label: "Ativações", path: "/activations", icon: "Activity", position: 6 },
    { label: "Clientes", path: "/customers", icon: "Users", position: 7 },
    { label: "Relatórios", path: "/reports", icon: "BarChart3", position: 8 },
    { label: "API Keys", path: "/api-keys", icon: "Key", position: 9 },
    { label: "Referências", path: "/referrals", icon: "UserPlus", position: 10 },
    { label: "Configurações", path: "/settings", icon: "Settings", position: 11 },
  ];

  try {
    // Verificar se já existem menus
    const existingMenus = await db.select().from(schema.adminMenus);
    
    if (existingMenus.length > 0) {
      console.log(`ℹ️  Já existem ${existingMenus.length} menus na base de dados`);
      console.log("⚠️  Para recriar os menus, elimine-os primeiro manualmente");
    } else {
      // Inserir menus padrão
      for (const menu of defaultMenus) {
        await db.insert(schema.adminMenus).values({
          label: menu.label,
          path: menu.path,
          icon: menu.icon,
          position: menu.position,
          active: true,
        });
        console.log(`✅ Menu criado: ${menu.label} (${menu.path})`);
      }
      
      console.log(`\n🎉 ${defaultMenus.length} menus criados com sucesso!`);
    }
  } catch (error) {
    console.error("❌ Erro ao criar menus:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedMenus();
