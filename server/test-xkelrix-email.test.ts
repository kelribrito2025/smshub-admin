import { describe, it, expect } from "vitest";
import { sendActivationEmail } from "./mailchimp-email";

describe("Test xkelrix@gmail.com Email Delivery", () => {
  it("should send activation email to xkelrix@gmail.com", async () => {
    const testEmail = "xkelrix@gmail.com";
    const testName = "Test User";
    const testCustomerId = 99999;

    console.log(`\n🔍 Testing email delivery to: ${testEmail}`);
    console.log(`📧 Customer ID: ${testCustomerId}`);
    console.log(`👤 Customer Name: ${testName}\n`);

    const success = await sendActivationEmail(testEmail, testName, testCustomerId);

    console.log(`\n📊 Email send result: ${success ? "✅ SUCCESS" : "❌ FAILED"}\n`);

    if (!success) {
      console.error(`\n⚠️  Email was REJECTED by Mandrill`);
      console.error(`Possible reasons:`);
      console.error(`  1. Email is in Mandrill's global block list`);
      console.error(`  2. Domain is blocked`);
      console.error(`  3. Previous spam complaints`);
      console.error(`  4. Mandrill account restrictions\n`);
    }

    expect(success).toBe(true);
  }, 30000);
});
