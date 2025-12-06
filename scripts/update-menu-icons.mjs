import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não está definida");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

// Mapeamento de paths para ícones corretos
const menuIconMap = {
  "/dashboard": "LayoutDashboard",
  "/relatorios": "LineChart",
  "/auditoria": "FileText",
  "/settings": "Settings",
  "/payment-settings": "CreditCard",
  "/apis": "Cloud",
  "/api-performance": "BarChart3",
  "/countries": "Globe",
  "/catalogo": "BookOpen",
  "/clientes": "Users",
  "/affiliates": "Gift",
};

console.log("🔄 Atualizando ícones dos menus...\n");

for (const [path, icon] of Object.entries(menuIconMap)) {
  try {
    await connection.execute(
      "UPDATE admin_menus SET icon = ? WHERE path = ?",
      [icon, path]
    );
    
    console.log(`✅ Atualizado: ${path} → ${icon}`);
  } catch (error) {
    console.error(`❌ Erro ao atualizar ${path}:`, error.message);
  }
}

console.log("\n✅ Ícones atualizados com sucesso!");

await connection.end();
