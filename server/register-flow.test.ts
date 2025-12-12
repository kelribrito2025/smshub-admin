import { describe, it, expect, beforeAll } from "vitest";
import { getCustomerByEmail, deleteCustomerByEmail, createCustomer } from "./customers-helpers";
import bcrypt from "bcrypt";

describe("Registration Flow with Email Test", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "Test123456!";
  const testName = "Test User Registration";

  beforeAll(async () => {
    // Limpar qualquer cliente de teste anterior
    try {
      await deleteCustomerByEmail(testEmail);
    } catch (error) {
      // Ignorar se não existir
    }
  });

  it("should register a new customer and send activation email", async () => {
    console.log(`\n🔍 Testing registration flow for: ${testEmail}\n`);

    // Importar dinamicamente para evitar problemas de inicialização
    const { sendActivationEmail } = await import("./mailchimp-email");

    // Simular o fluxo de registro
    console.log("1️⃣ Hashing password...");
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    console.log("✅ Password hashed");

    console.log("\n2️⃣ Creating customer...");
    const customer = await createCustomer({
      email: testEmail,
      name: testName,
      password: hashedPassword,
      emailVerified: false,
    });
    console.log(`✅ Customer created with ID: ${customer.id}`);

    console.log(`\n3️⃣ Sending activation email to ${customer.email}...`);
    const emailSent = await sendActivationEmail(
      customer.email,
      customer.name,
      customer.id
    );

    if (emailSent) {
      console.log(`✅ Activation email sent successfully!`);
    } else {
      console.error(`❌ Failed to send activation email`);
    }

    console.log("\n4️⃣ Verifying customer was created in database...");
    const savedCustomer = await getCustomerByEmail(testEmail);
    expect(savedCustomer).toBeDefined();
    expect(savedCustomer?.email).toBe(testEmail);
    expect(savedCustomer?.name).toBe(testName);
    expect(savedCustomer?.emailVerified).toBe(false);
    console.log("✅ Customer verified in database");

    console.log("\n5️⃣ Cleaning up test customer...");
    await deleteCustomerByEmail(testEmail);
    console.log("✅ Test customer deleted\n");

    expect(emailSent).toBe(true);
  }, 30000);
});
