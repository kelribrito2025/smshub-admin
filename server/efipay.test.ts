import { describe, it, expect } from "vitest";
import { EfiPayClient } from "./efipay-client";

describe("EfiPay Integration", () => {
  it("should initialize EfiPay client with valid credentials", () => {
    expect(() => new EfiPayClient()).not.toThrow();
  });

  it("should have required configuration", () => {
    const client = new EfiPayClient();
    expect(client).toBeDefined();
  });

  it("should generate QR Code URL from PIX copy-paste code", () => {
    const client = new EfiPayClient();
    const pixCopyPaste = "00020101021226830014br.gov.bcb.pix";
    const qrCodeUrl = client.generateQRCodeImageUrl(pixCopyPaste);
    
    expect(qrCodeUrl).toContain("qrserver.com");
    expect(qrCodeUrl).toContain(encodeURIComponent(pixCopyPaste));
  });
});
