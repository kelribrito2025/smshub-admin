import { describe, it, expect, beforeEach } from "vitest";
import { notificationsManager } from "./notifications-manager";
import type { Response } from "express";

/**
 * Test: Global notifications should NOT be sent to admins
 * 
 * This test validates that when sending a global notification,
 * only users (role: "user") receive it, and admins (role: "admin") are excluded.
 */

describe("Global Notifications Filter", () => {
  // Mock Response objects
  let mockUserResponse: Partial<Response>;
  let mockAdminResponse: Partial<Response>;
  let userMessages: string[] = [];
  let adminMessages: string[] = [];

  beforeEach(() => {
    // Reset message arrays
    userMessages = [];
    adminMessages = [];

    // Mock user response
    mockUserResponse = {
      writeHead: () => mockUserResponse as Response,
      write: (data: string) => {
        userMessages.push(data);
        return true;
      },
      end: () => mockUserResponse as Response,
      flushHeaders: () => {},
      on: () => mockUserResponse as Response,
      once: () => mockUserResponse as Response,
      writableEnded: false,
      socket: {
        setNoDelay: () => {},
        setTimeout: () => {},
      } as any,
    };

    // Mock admin response
    mockAdminResponse = {
      writeHead: () => mockAdminResponse as Response,
      write: (data: string) => {
        adminMessages.push(data);
        return true;
      },
      end: () => mockAdminResponse as Response,
      flushHeaders: () => {},
      on: () => mockAdminResponse as Response,
      once: () => mockAdminResponse as Response,
      writableEnded: false,
      socket: {
        setNoDelay: () => {},
        setTimeout: () => {},
      } as any,
    };
  });

  it("should send global notifications only to users, not admins", () => {
    // Add user client (role: user)
    notificationsManager.addClient(1, mockUserResponse as Response, "user");

    // Add admin client (role: admin)
    notificationsManager.addClient(2, mockAdminResponse as Response, "admin");

    // Send global notification
    notificationsManager.sendToAllUsers({
      type: "admin_notification",
      title: "Teste Global",
      message: "Esta notificação deve chegar apenas para usuários",
    });

    // Verify user received the notification
    const userDataMessages = userMessages.filter((msg) => msg.startsWith("data:"));
    expect(userDataMessages.length).toBeGreaterThan(0);
    expect(userDataMessages[0]).toContain("Teste Global");

    // Verify admin did NOT receive the notification
    const adminDataMessages = adminMessages.filter((msg) => msg.startsWith("data:"));
    expect(adminDataMessages.length).toBe(0);
  });

  it("should send individual notifications to both users and admins", () => {
    // Add user client
    notificationsManager.addClient(1, mockUserResponse as Response, "user");

    // Add admin client
    notificationsManager.addClient(2, mockAdminResponse as Response, "admin");

    // Send notification to user
    notificationsManager.sendToCustomer(1, {
      type: "admin_notification",
      title: "Notificação Individual",
      message: "Para usuário específico",
    });

    // Send notification to admin
    notificationsManager.sendToCustomer(2, {
      type: "admin_notification",
      title: "Notificação Individual",
      message: "Para admin específico",
    });

    // Verify both received their individual notifications
    const userDataMessages = userMessages.filter((msg) => msg.startsWith("data:"));
    expect(userDataMessages.length).toBeGreaterThan(0);

    const adminDataMessages = adminMessages.filter((msg) => msg.startsWith("data:"));
    expect(adminDataMessages.length).toBeGreaterThan(0);
  });

  it("should send to all clients (including admins) when using sendToAll", () => {
    // Add user client
    notificationsManager.addClient(1, mockUserResponse as Response, "user");

    // Add admin client
    notificationsManager.addClient(2, mockAdminResponse as Response, "admin");

    // Send to all (including admins)
    notificationsManager.sendToAll({
      type: "admin_notification",
      title: "Notificação para Todos",
      message: "Incluindo admins",
    });

    // Verify both received the notification
    const userDataMessages = userMessages.filter((msg) => msg.startsWith("data:"));
    expect(userDataMessages.length).toBeGreaterThan(0);

    const adminDataMessages = adminMessages.filter((msg) => msg.startsWith("data:"));
    expect(adminDataMessages.length).toBeGreaterThan(0);
  });
});
