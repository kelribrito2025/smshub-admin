import { z } from "zod";
import { router } from "../_core/trpc";
import { adminProcedure } from "../admin-middleware";
import { getDb } from "../db";
import { adminMenus } from "../../drizzle/schema";
import { eq, asc } from "drizzle-orm";

export const adminMenusRouter = router({
  /**
   * Get all menu items ordered by position
   */
  getAll: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const menus = await db
      .select()
      .from(adminMenus)
      .where(eq(adminMenus.active, true))
      .orderBy(asc(adminMenus.position));
    
    return menus;
  }),

  /**
   * Update menu order
   */
  updateOrder: adminProcedure
    .input(
      z.array(
        z.object({
          id: z.number(),
          position: z.number(),
        })
      )
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Update each menu item's position
      for (const item of input) {
        await db
          .update(adminMenus)
          .set({ position: item.position })
          .where(eq(adminMenus.id, item.id));
      }

      return { success: true };
    }),

  /**
   * Create a new menu item
   */
  create: adminProcedure
    .input(
      z.object({
        label: z.string().min(1, "Label é obrigatório"),
        path: z.string().min(1, "Path é obrigatório"),
        icon: z.string().optional(),
        position: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the highest position to add at the end
      const menus = await db.select().from(adminMenus).orderBy(asc(adminMenus.position));
      const maxPosition = menus.length > 0 ? Math.max(...menus.map(m => m.position)) : 0;

      const result = await db.insert(adminMenus).values({
        label: input.label,
        path: input.path,
        icon: input.icon ?? null,
        position: input.position ?? maxPosition + 1,
        active: true,
      });

      return { success: true };
    }),

  /**
   * Update an existing menu item
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        label: z.string().min(1).optional(),
        path: z.string().min(1).optional(),
        icon: z.string().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;
      await db.update(adminMenus).set(updates).where(eq(adminMenus.id, id));

      return { success: true };
    }),

  /**
   * Delete a menu item
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(adminMenus).where(eq(adminMenus.id, input.id));

      return { success: true };
    }),

  /**
   * Initialize default menu items (run once)
   */
  initializeDefaults: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if menus already exist
    const existing = await db.select().from(adminMenus).limit(1);
    if (existing.length > 0) {
      return { success: false, message: "Menus already initialized" };
    }

    // Default menu structure based on current navigation
    const defaultMenus = [
      { label: "Dashboard", path: "/", icon: "LayoutDashboard", position: 1 },
      { label: "Configurações", path: "/settings", icon: "Settings", position: 2 },
      { label: "Países", path: "/countries", icon: "Globe", position: 3 },
      { label: "Serviços", path: "/services", icon: "Package", position: 4 },
      { label: "Catálogo", path: "/catalog", icon: "BookOpen", position: 5 },
      { label: "Clientes", path: "/customers", icon: "Users", position: 6 },
      { label: "Financeiro", path: "/financial", icon: "DollarSign", position: 7 },
      { label: "API Keys", path: "/api-keys", icon: "Key", position: 8 },
      { label: "Documentação API", path: "/api-docs", icon: "FileText", position: 9 },
      { label: "APIs SMSHub", path: "/apis", icon: "Server", position: 10 },
      { label: "Métricas de API", path: "/api-metrics", icon: "BarChart", position: 11 },
      { label: "Auditoria", path: "/audit", icon: "Shield", position: 12 },
      { label: "Afiliados", path: "/affiliate-admin", icon: "UserPlus", position: 13 },
      { label: "Taxa de Câmbio", path: "/exchange-rate", icon: "TrendingUp", position: 14 },
    ];

    await db.insert(adminMenus).values(defaultMenus);

    return { success: true, message: "Default menus initialized" };
  }),
});
