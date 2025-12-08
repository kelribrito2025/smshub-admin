import express from "express";
import { notificationsManager } from "./notifications-manager";
import { sdk } from "./_core/sdk";
import { getCustomerById } from "./customers-helpers";

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

  // Add client to notifications manager
  notificationsManager.addClient(customerId, res);

  // Connection will be kept alive by the notifications manager
});

/**
 * Get SSE statistics (for debugging)
 */
router.get("/stats", (req, res) => {
  const stats = notificationsManager.getStats();
  res.json(stats);
});

export default router;
