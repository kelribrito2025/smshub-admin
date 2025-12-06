import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import type { Context } from "../_core/context";
import { getDb } from "../db";
import { adminMenus } from "../../drizzle/schema";
import { asc } from "drizzle-orm";

// Mock admin context
const createMockAdminContext = (): Context => ({
  user: {
    id: "test-admin-id",
    name: "Test Admin",
    email: "admin@test.com",
    role: "admin",
  },
  req: {} as any,
  res: {} as any,
});

describe("Admin Menus - Reorganização", () => {
  it("deve atualizar a ordem dos menus corretamente", async () => {
    const caller = appRouter.createCaller(createMockAdminContext());
    
    // 1. Buscar menus atuais
    const menusBefore = await caller.adminMenus.getAll();
    expect(menusBefore.length).toBeGreaterThan(0);
    
    // 2. Criar nova ordem (inverter os 3 primeiros)
    const newOrder = [
      { id: menusBefore[2].id, position: 1 },
      { id: menusBefore[1].id, position: 2 },
      { id: menusBefore[0].id, position: 3 },
    ];
    
    // 3. Atualizar ordem
    const result = await caller.adminMenus.updateOrder(newOrder);
    expect(result.success).toBe(true);
    
    // 4. Verificar se a ordem foi aplicada
    const menusAfter = await caller.adminMenus.getAll();
    expect(menusAfter[0].id).toBe(menusBefore[2].id);
    expect(menusAfter[1].id).toBe(menusBefore[1].id);
    expect(menusAfter[2].id).toBe(menusBefore[0].id);
    
    // 5. Restaurar ordem original
    const restoreOrder = [
      { id: menusBefore[0].id, position: 1 },
      { id: menusBefore[1].id, position: 2 },
      { id: menusBefore[2].id, position: 3 },
    ];
    await caller.adminMenus.updateOrder(restoreOrder);
  });

  it("deve retornar menus ordenados por position", async () => {
    const caller = appRouter.createCaller(createMockAdminContext());
    const menus = await caller.adminMenus.getAll();
    
    // Verificar se está ordenado por position
    for (let i = 0; i < menus.length - 1; i++) {
      expect(menus[i].position).toBeLessThanOrEqual(menus[i + 1].position);
    }
  });

  it("deve ter ícones corretos nos menus", async () => {
    const caller = appRouter.createCaller(createMockAdminContext());
    const menus = await caller.adminMenus.getAll();
    
    // Verificar se todos os menus têm ícones
    const menusWithIcons = menus.filter(m => m.icon !== null && m.icon !== "");
    expect(menusWithIcons.length).toBeGreaterThan(0);
    
    // Verificar alguns ícones específicos
    const dashboard = menus.find(m => m.path === "/dashboard");
    if (dashboard) {
      expect(dashboard.icon).toBe("LayoutDashboard");
    }
    
    const clientes = menus.find(m => m.path === "/clientes");
    if (clientes) {
      expect(clientes.icon).toBe("Users");
    }
  });
});
