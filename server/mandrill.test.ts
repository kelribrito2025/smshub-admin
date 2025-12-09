import { describe, it, expect } from "vitest";
import { testMandrillConnection } from "./mailchimp-email";

describe("Mandrill API Connection", () => {
  it("should connect to Mandrill API successfully", async () => {
    const result = await testMandrillConnection();
    expect(result).toBe(true);
  }, 10000); // 10 second timeout for API call
});
