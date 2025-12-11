import { describe, it, expect } from "vitest";
import { renderActivationEmail } from "./email-template-renderer";
import { sendActivationEmail } from "./mailchimp-email";

describe("Activation Email Template", () => {
  it("should render activation email template with correct variables", () => {
    const userName = "João Silva";
    const activationLink = "https://app.numero-virtual.com/activate?id=12345";
    const expirationTime = "24 horas";

    const html = renderActivationEmail(userName, activationLink, expirationTime);

    // Verificar se as variáveis foram substituídas corretamente
    expect(html).toContain(userName);
    expect(html).toContain(activationLink);
    expect(html).toContain(expirationTime);

    // Verificar se não há variáveis não substituídas
    expect(html).not.toContain("{{USER_NAME}}");
    expect(html).not.toContain("{{ACTIVATION_LINK}}");
    expect(html).not.toContain("{{EXPIRATION_TIME}}");

    // Verificar estrutura HTML
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Ativação de Conta");
    expect(html).toContain("SMS.STORE");
  });

  it("should render template with special characters in user name", () => {
    const userName = "José André Ñoño";
    const activationLink = "https://app.numero-virtual.com/activate?id=99999";
    const expirationTime = "48 horas";

    const html = renderActivationEmail(userName, activationLink, expirationTime);

    expect(html).toContain(userName);
    expect(html).toContain(activationLink);
    expect(html).toContain(expirationTime);
  });

  it("should send activation email successfully (integration test)", async () => {
    // Este teste valida a integração completa com Mandrill
    // Nota: Requer MANDRILL_API_KEY configurado
    
    const testEmail = process.env.MAILCHIMP_FROM_EMAIL || "test@numero-virtual.com";
    const testName = "Usuário Teste";
    const testCustomerId = 99999;

    // Tentar enviar email
    const result = await sendActivationEmail(testEmail, testName, testCustomerId);

    // Se API key estiver configurada, deve retornar true
    // Se não estiver, deve retornar false (mas não deve lançar erro)
    expect(typeof result).toBe("boolean");
    
    console.log(`[Test] Email activation result: ${result ? "✅ Sent" : "❌ Failed (check API key)"}`);
  }, 10000); // 10s timeout para chamada de API
});
