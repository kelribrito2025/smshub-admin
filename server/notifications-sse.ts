import express from "express";
import { notificationsManager } from "./notifications-manager";
import { sdk } from "./_core/sdk";
import { getCustomerById } from "./customers-helpers";
import { sseRateLimiter } from "./sse-rate-limiter";

const router = express.Router();

/**
 * SSE endpoint for real-time notifications
 * Clients connect to this endpoint to receive push notifications
 */
router.get("/stream/:customerId", async (req, res) => {
  const customerId = parseInt(req.params.customerId);

  if (isNaN(customerId)) {
    return res.status(400).json({ error: "Invalid customer ID" });
  }
  
  // ✅ CRITICAL: Disable all timeouts for SSE connections
  req.setTimeout(0); // Disable request timeout
  res.setTimeout(0); // Disable response timeout
  if (req.socket) {
    req.socket.setTimeout(0); // Disable socket timeout
  }

  // ✅ VALIDATE CUSTOMER: Check if customer exists and is active
  // Note: Customers use localStorage auth (not session cookies), so we validate directly
  const customer = await getCustomerById(customerId);
  
  if (!customer) {
    console.warn(`[SSE] Customer ${customerId} not found`);
    return res.status(404).json({ error: "customer not found" });
  }
  
  if (!customer.active) {
    console.warn(`[SSE] Customer ${customerId} is inactive`);
    return res.status(403).json({ error: "customer account is inactive" });
  }
  
  if (customer.banned) {
    console.warn(`[SSE] Customer ${customerId} is banned`);
    return res.status(403).json({ error: "customer account is banned" });
  }

  console.log(`[SSE] New connection request from authenticated customer ${customerId}`);

  // ✅ CHECK RATE LIMIT: Verificar se cliente pode conectar
  // Rate limiter sempre ativo (mesmo em DEV) para prevenir loops infinitos
  const rateLimitCheck = sseRateLimiter.canConnect(customerId);
  
  if (!rateLimitCheck.allowed) {
    console.warn(`[SSE] Connection rejected for customer ${customerId}: ${rateLimitCheck.reason}`);
    // Return 409 Conflict instead of 429 to avoid triggering exponential backoff
    return res.status(409).json({ 
      error: "Duplicate connection",
      message: rateLimitCheck.reason 
    });
  }

  // Registrar conexão no rate limiter
  sseRateLimiter.registerConnection(customerId);

  // Add client to notifications manager
  notificationsManager.addClient(customerId, res);
  
  console.log(`[SSE] ✅ Client ${customerId} added to notifications manager, response should stay open`);

  // Remover conexão do rate limiter quando cliente desconectar
  res.on('close', () => {
    sseRateLimiter.unregisterConnection(customerId);
    console.log(`[SSE] Client ${customerId} disconnected, unregistered from rate limiter`);
  });

  // Connection will be kept alive by the notifications manager
  // DO NOT call res.end() or res.send() here - SSE connection must stay open
});

/**
 * Get SSE statistics (for debugging)
 */
router.get("/stats", (req, res) => {
  const notificationStats = notificationsManager.getStats();
  const rateLimiterStats = sseRateLimiter.getStats();
  
  res.json({
    notifications: notificationStats,
    rateLimiter: rateLimiterStats,
  });
});

export default router;
