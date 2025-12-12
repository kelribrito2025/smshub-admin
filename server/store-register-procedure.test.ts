import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";
import { getCustomerByEmail } from "./customers-helpers";

describe("Store Register Procedure Test", () => {
  const testEmail = `test-register-${Date.now()}@gmail.com`;
  const testPassword = "TestPassword123!";
  const testName = "Test Registration User";

  let createdCustomerId: number | null = null;

  afterAll(async () => {
    // Cleanup: remover cliente de teste do banco
    if (createdCustomerId) {
      const { getDb } = await import("./db");
      const { customers } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const db = await getDb();
      if (db) {
        await db.delete(customers).where(eq(customers.id, createdCustomerId));
        console.log(`✅ Test customer ${createdCustomerId} deleted from database`);
      }
    }
  });

  it("should register a new customer via tRPC procedure and send activation email", async () => {
    console.log(`\n🔍 Testing tRPC store.register procedure`);
    console.log(`📧 Email: ${testEmail}`);
    console.log(`👤 Name: ${testName}\n`);

    // Create a mock context (public procedure doesn't need user)
    const mockContext: Context = {
      user: null,
      req: {} as any,
      res: {} as any,
    };

    // Create caller with mock context
    const caller = appRouter.createCaller(mockContext);

    console.log("1️⃣ Calling store.register procedure...");
    
    // Capture console.log to verify email sending
    const originalLog = console.log;
    const originalError = console.error;
    const logs: string[] = [];
    const errors: string[] = [];
    
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };
    
    console.error = (...args) => {
      errors.push(args.join(' '));
      originalError(...args);
    };
    
    // Call the register procedure
    const customer = await caller.store.register({
      email: testEmail,
      password: testPassword,
      name: testName,
    });
    
    // Restore console
    console.log = originalLog;
    console.error = originalError;

    console.log(`✅ Customer registered with ID: ${customer.id}`);
    createdCustomerId = customer.id;

    // Verify customer was created
    expect(customer).toBeDefined();
    expect(customer.email).toBe(testEmail);
    expect(customer.name).toBe(testName);
    expect(customer.emailVerified).toBe(false);

    console.log("\n2️⃣ Verifying customer in database...");
    const savedCustomer = await getCustomerByEmail(testEmail);
    expect(savedCustomer).toBeDefined();
    expect(savedCustomer?.id).toBe(customer.id);
    console.log("✅ Customer verified in database");

    console.log("\n3️⃣ Analyzing captured logs...");
    
    const emailSendingLog = logs.find(log => log.includes('[Store Register] Sending activation email'));
    const emailSuccessLog = logs.find(log => log.includes('[Store Register] ✅ Activation email sent successfully'));
    const emailErrorLog = errors.find(log => log.includes('[Store Register] ❌ Failed to send activation email'));
    
    console.log("\n📊 Email Sending Analysis:");
    console.log(`  - Email sending initiated: ${emailSendingLog ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Email sent successfully: ${emailSuccessLog ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Email sending error: ${emailErrorLog ? '❌ YES' : '✅ NO'}`);
    
    if (emailErrorLog) {
      console.error(`\n⚠️  Email Error Details:`);
      console.error(emailErrorLog);
    }
    
    console.log("\n✅ Registration procedure completed successfully!");
    console.log(`📧 Email should have been sent to: ${testEmail}`);
    console.log(`🔍 Customer ID: ${customer.id}\n`);
    
    // Assert that email was sent
    expect(emailSendingLog).toBeDefined();
    expect(emailSuccessLog).toBeDefined();
    expect(emailErrorLog).toBeUndefined();
  }, 30000);
});
