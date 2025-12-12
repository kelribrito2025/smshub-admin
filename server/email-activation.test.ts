import { describe, it, expect } from "vitest";
import { sendActivationEmail, testMandrillConnection } from "./mailchimp-email";

describe("Email Activation Tests", () => {
  it("should have Mandrill API key configured", () => {
    expect(process.env.MANDRILL_API_KEY).toBeDefined();
    expect(process.env.MANDRILL_API_KEY).not.toBe("");
  });

  it("should have email configuration", () => {
    expect(process.env.MAILCHIMP_FROM_EMAIL).toBeDefined();
    expect(process.env.MAILCHIMP_FROM_NAME).toBeDefined();
  });

  it("should connect to Mandrill API", async () => {
    const isConnected = await testMandrillConnection();
    expect(isConnected).toBe(true);
  }, 10000);

  it("should send activation email successfully", async () => {
    const testEmail = "xkelrix@gmail.com";
    const testName = "Test User";
    const testCustomerId = 99999;

    console.log(`\n🔍 Testing email send to: ${testEmail}`);
    console.log(`📧 Customer ID: ${testCustomerId}`);
    console.log(`👤 Customer Name: ${testName}\n`);

    const success = await sendActivationEmail(testEmail, testName, testCustomerId);

    console.log(`\n✅ Email send result: ${success ? "SUCCESS" : "FAILED"}\n`);

    expect(success).toBe(true);
  }, 30000);
});
