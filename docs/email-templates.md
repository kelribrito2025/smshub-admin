# Sistema de Templates de Email

Este documento descreve como usar o sistema de templates de email no SMS Hub Admin.

## Visão Geral

O sistema de templates de email permite criar emails HTML reutilizáveis com variáveis dinâmicas que são substituídas em tempo de execução. Todos os emails são enviados via **Mandrill API** (Mailchimp Transactional).

## Estrutura de Arquivos

```
server/
├── email-templates/           # Diretório de templates HTML
│   └── activation-email.html  # Template de ativação de conta
├── email-template-renderer.ts # Helper para renderizar templates
└── mailchimp-email.ts         # Funções de envio de email
```

## Como Funciona

### 1. Templates HTML

Os templates são arquivos HTML armazenados em `server/email-templates/`. Eles usam a sintaxe `{{VARIABLE_NAME}}` para marcar variáveis dinâmicas.

**Exemplo:**
```html
<h2>Olá, {{USER_NAME}}!</h2>
<a href="{{ACTIVATION_LINK}}">Ativar Conta</a>
<p>Este link expira em {{EXPIRATION_TIME}}.</p>
```

### 2. Renderização de Templates

O arquivo `email-template-renderer.ts` fornece funções para renderizar templates:

```typescript
import { renderActivationEmail } from "./email-template-renderer";

const html = renderActivationEmail(
  "João Silva",                                    // USER_NAME
  "https://app.numero-virtual.com/activate?id=123", // ACTIVATION_LINK
  "24 horas"                                        // EXPIRATION_TIME
);
```

### 3. Envio de Email

O arquivo `mailchimp-email.ts` contém funções para enviar emails via Mandrill:

```typescript
import { sendActivationEmail } from "./mailchimp-email";

await sendActivationEmail(
  "usuario@example.com",  // Email do destinatário
  "João Silva",           // Nome do usuário
  12345                   // ID do cliente
);
```

## Templates Disponíveis

### Email de Ativação de Conta

**Arquivo:** `server/email-templates/activation-email.html`

**Função:** `sendActivationEmail(customerEmail, customerName, customerId)`

**Variáveis:**
- `{{USER_NAME}}` - Nome do usuário
- `{{ACTIVATION_LINK}}` - Link de ativação completo
- `{{EXPIRATION_TIME}}` - Tempo de expiração (padrão: "24 horas")

**Design:**
- Tema escuro com verde neon (#22c55e)
- Estilo cyberpunk/hacker
- Fonte monoespaçada (Courier New)
- Grid background sutil
- Bordas decorativas nos cantos

**Uso:**
```typescript
import { sendActivationEmail } from "./server/mailchimp-email";

// Enviar email de ativação para novo usuário
const success = await sendActivationEmail(
  "novo.usuario@example.com",
  "Novo Usuário",
  12345
);

if (success) {
  console.log("Email enviado com sucesso!");
} else {
  console.error("Falha ao enviar email");
}
```

## Criar Novos Templates

### Passo 1: Criar arquivo HTML

Crie um novo arquivo em `server/email-templates/` (ex: `welcome-email.html`):

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Bem-vindo</title>
</head>
<body>
  <h1>Olá, {{USER_NAME}}!</h1>
  <p>Bem-vindo ao {{SYSTEM_NAME}}!</p>
</body>
</html>
```

### Passo 2: Adicionar função de renderização

Edite `server/email-template-renderer.ts`:

```typescript
export function renderWelcomeEmail(
  userName: string,
  systemName: string
): string {
  return renderEmailTemplate("welcome-email", {
    USER_NAME: userName,
    SYSTEM_NAME: systemName,
  });
}
```

### Passo 3: Adicionar função de envio

Edite `server/mailchimp-email.ts`:

```typescript
export async function sendWelcomeEmail(
  customerEmail: string,
  customerName: string
): Promise<boolean> {
  const { renderWelcomeEmail } = await import("./email-template-renderer.js");
  
  const html = renderWelcomeEmail(
    customerName,
    "Número Virtual"
  );

  return sendEmail({
    to: customerEmail,
    subject: "🎉 Bem-vindo!",
    html,
  });
}
```

### Passo 4: Criar teste

Crie `server/welcome-email.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { renderWelcomeEmail } from "./email-template-renderer";
import { sendWelcomeEmail } from "./mailchimp-email";

describe("Welcome Email Template", () => {
  it("should render welcome email template", () => {
    const html = renderWelcomeEmail("João", "Número Virtual");
    expect(html).toContain("João");
    expect(html).toContain("Número Virtual");
  });

  it("should send welcome email", async () => {
    const result = await sendWelcomeEmail(
      "test@example.com",
      "Test User"
    );
    expect(typeof result).toBe("boolean");
  });
});
```

## Variáveis de Ambiente

O sistema de email usa as seguintes variáveis de ambiente:

- `MANDRILL_API_KEY` - Chave de API do Mandrill (obrigatória)
- `MAILCHIMP_FROM_EMAIL` - Email do remetente (padrão: noreply@numero-virtual.com)
- `MAILCHIMP_FROM_NAME` - Nome do remetente (padrão: Número Virtual)

## Testes

Execute os testes de email:

```bash
# Testar template de ativação
pnpm test activation-email-template.test.ts

# Testar todos os templates
pnpm test email
```

## Boas Práticas

1. **Use inline CSS** - Muitos clientes de email não suportam `<style>` tags
2. **Use tabelas para layout** - Flexbox e Grid não funcionam em emails
3. **Teste em múltiplos clientes** - Gmail, Outlook, Apple Mail, etc.
4. **Mantenha HTML simples** - Evite JavaScript e CSS avançado
5. **Otimize imagens** - Use URLs absolutas e tamanhos pequenos
6. **Sempre forneça texto alternativo** - Para quando o botão não funcionar
7. **Respeite privacidade** - Não rastreie usuários sem consentimento

## Debugging

### Email não está sendo enviado

1. Verifique se `MANDRILL_API_KEY` está configurada
2. Verifique logs do servidor: `[Mandrill] Email sent successfully`
3. Teste conexão: `pnpm test mandrill.test.ts`

### Variáveis não estão sendo substituídas

1. Verifique se o nome da variável está correto (case-sensitive)
2. Verifique se está usando `{{VARIABLE}}` (duas chaves)
3. Verifique se a variável está sendo passada para `renderEmailTemplate()`

### Template não está sendo encontrado

1. Verifique se o arquivo existe em `server/email-templates/`
2. Verifique se o nome do arquivo está correto (sem extensão na função)
3. Verifique permissões do arquivo

## Referências

- [Mandrill API Documentation](https://mailchimp.com/developer/transactional/api/)
- [Email Design Best Practices](https://www.campaignmonitor.com/dev-resources/)
- [HTML Email Templates Guide](https://templates.mailchimp.com/)
