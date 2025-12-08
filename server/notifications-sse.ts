import express from "express";
import { notificationsManager } from "./notifications-manager";
import { sdk } from "./_core/sdk";

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

  // ✅ VALIDATE AUTHENTICATION: Check if user is logged in
  let authenticatedUser;
  try {
    authenticatedUser = await sdk.authenticateRequest(req);
  } catch (error) {
    console.error(`[SSE] Authentication failed for customer ${customerId}:`, error);
    return res.status(401).json({ error: "no customer authenticated" });
  }

  // ✅ AUTHORIZATION: Verify that authenticated user matches requested customerId
  if (!authenticatedUser || authenticatedUser.id !== customerId) {
    console.error(`[SSE] Authorization failed: user ${authenticatedUser?.id} tried to access customer ${customerId}`);
    return res.status(403).json({ error: "forbidden: cannot access other customer's notifications" });
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
