import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import restApiRouter from "../rest-api";
import pixWebhookRouter from "../webhook-pix";
import stripeWebhookRouter from "../stripe-webhook";
import notificationsSseRouter from "../notifications-sse";
import { initExchangeRateCron } from "../exchange-rate";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Global CORS middleware for all routes
  app.use((req, res, next) => {
    // Get origin from request or use wildcard for development
    const origin = req.headers.origin || "*";
    
    // In production, allow specific domains
    const allowedOrigins = [
      "https://app.numero-virtual.com",
      "https://smshubadm-sokyccse.manus.space",
      "http://localhost:3000",
      "http://localhost:5173",
    ];
    
    // Check if origin is allowed
    const isAllowed = origin === "*" || allowedOrigins.includes(origin);
    
    if (isAllowed) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
    }
    
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key, Cookie, Set-Cookie, x-trpc-source");
    res.header("Access-Control-Expose-Headers", "Set-Cookie");
    res.header("Access-Control-Max-Age", "86400"); // 24 hours cache for preflight
    
    // Handle preflight OPTIONS requests
    if (req.method === "OPTIONS") {
      return res.status(204).send();
    }
    
    next();
  });
  
  // Legacy CORS middleware for public API (kept for compatibility)
  app.use("/api/public", (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization");
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    
    next();
  });
  
  // Stripe Webhook (MUST be registered BEFORE express.json() middleware to receive raw body)
  app.use("/api/stripe", express.raw({ type: "application/json" }), stripeWebhookRouter);
  
  // PIX Webhook (needs JSON body parser for EfiPay payloads)
  app.use("/api", express.json(), pixWebhookRouter);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // REST API for public endpoints
  app.use("/api/public", restApiRouter);
  // SSE Notifications
  app.use("/api/notifications", notificationsSseRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Initialize exchange rate cron job
    initExchangeRateCron();
  });
}

startServer().catch(console.error);
