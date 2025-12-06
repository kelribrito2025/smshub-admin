import { appRouter } from "./server/routers.ts";

const caller = appRouter.createCaller({
  user: { 
    id: 1, 
    role: "admin", 
    openId: "system", 
    name: "System", 
    email: "system@admin.com", 
    loginMethod: "system", 
    createdAt: new Date(), 
    updatedAt: new Date(), 
    lastSignedIn: new Date() 
  },
  req: {},
  res: {},
});

try {
  const result = await caller.adminMenus.initializeDefaults();
  console.log(result);
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}

process.exit(0);
