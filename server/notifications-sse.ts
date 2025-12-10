import express from "express";
import { notificationsManager } from "./notifications-manager";
import { sdk } from "./_core/sdk";
import { getCustomerById } from "./customers-helpers";
import crypto from "crypto";

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

  // Generate or extract sessionId from headers
  // Frontend should send a unique sessionId in X-Session-Id header
  const sessionId = req.headers['x-session-id'] as string || crypto.randomUUID();

  console.log(`[SSE] New connection request from customer ${customerId} (role: ${customer.role}, sessionId: ${sessionId})`);

  // Add client to notifications manager with sessionId and role
  notificationsManager.addClient(customerId, sessionId, res, customer.role);
  
  console.log(`[SSE] ✅ Client ${customerId} added to notifications manager, response should stay open`);

  // Connection will be kept alive by the notifications manager
  // DO NOT call res.end() or res.send() here - SSE connection must stay open
});

/**
 * Get SSE statistics (for debugging)
 */
router.get("/stats", (req, res) => {
  const stats = notificationsManager.getStats();
  res.json(stats);
});

export default router;
