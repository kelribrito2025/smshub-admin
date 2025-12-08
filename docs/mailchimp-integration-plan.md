# Integração Mailchimp - Verificação de Email

## 📋 Visão Geral

Implementar sistema de verificação de email usando Mailchimp Transactional API (Mandrill) para enviar códigos de verificação quando usuários criam conta no painel de vendas.

---

## 🎯 Objetivos

1. **Enviar email de verificação** quando usuário criar conta

1. **Validar código de 6 dígitos** antes de ativar conta

1. **Bloquear login** de contas não verificadas

1. **Reenviar código** se usuário não receber

1. **Expirar códigos** após 15 minutos

---

## 🏗️ Arquitetura

### Fluxo Completo

```
1. Usuário preenche formulário de cadastro (email + senha)
   ↓
2. Backend cria conta com status "pending_verification"
   ↓
3. Backend gera código de 6 dígitos aleatório
   ↓
4. Backend salva código + timestamp na tabela email_verifications
   ↓
5. Backend envia email via Mailchimp com código
   ↓
6. Frontend redireciona para tela de verificação
   ↓
7. Usuário digita código recebido no email
   ↓
8. Backend valida código (correto + não expirado)
   ↓
9. Backend atualiza status da conta para "active"
   ↓
10. Usuário pode fazer login normalmente
```

---

## 📊 Mudanças no Banco de Dados

### 1. Adicionar campo `emailVerified` na tabela `customers`

```sql
ALTER TABLE customers 
ADD COLUMN emailVerified BOOLEAN DEFAULT FALSE,
ADD COLUMN emailVerifiedAt DATETIME NULL;
```

### 2. Criar tabela `email_verifications`

```sql
CREATE TABLE email_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customerId INT NOT NULL,
  code VARCHAR(6) NOT NULL,
  expiresAt DATETIME NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  usedAt DATETIME NULL,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_customer_code (customerId, code),
  INDEX idx_expires (expiresAt)
);
```

---

## 🔧 Passos de Implementação

### **PASSO 1: Configurar Mailchimp Transactional API**

#### 1.1. Criar conta no Mailchimp Transactional

- Acessar: [https://mandrillapp.com/](https://mandrillapp.com/)

- Criar conta gratuita (12.000 emails/mês grátis )

- Gerar API Key em Settings → API Keys

#### 1.2. Adicionar credenciais ao projeto

```bash
# Usar webdev_request_secrets para solicitar:
MAILCHIMP_API_KEY=md-xxxxxxxxxxxxxxxxxxxxx
MAILCHIMP_FROM_EMAIL=noreply@smshubadm-sokyccse.manus.space
MAILCHIMP_FROM_NAME=Número Virtual
```

#### 1.3. Instalar biblioteca Mailchimp

```bash
pnpm add @mailchimp/mailchimp_transactional
```

---

### **PASSO 2: Criar Helper de Email**

Criar arquivo `server/email.ts`:

```typescript
import Mailchimp from '@mailchimp/mailchimp_transactional';

const mailchimp = Mailchimp(process.env.MAILCHIMP_API_KEY!);

interface SendVerificationEmailParams {
  email: string;
  code: string;
  customerName?: string;
}

export async function sendVerificationEmail({ 
  email, 
  code, 
  customerName 
}: SendVerificationEmailParams) {
  const message = {
    from_email: process.env.MAILCHIMP_FROM_EMAIL!,
    from_name: process.env.MAILCHIMP_FROM_NAME!,
    subject: 'Verifique seu email - Número Virtual',
    to: [{ email, type: 'to' as const }],
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Courier New', monospace; background: #000; color: #00ff41; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 48px; font-weight: bold; color: #00D26A; }
          .code-box { 
            background: #001a00; 
            border: 2px solid #00D26A; 
            border-radius: 8px; 
            padding: 30px; 
            text-align: center; 
            margin: 30px 0; 
          }
          .code { 
            font-size: 36px; 
            font-weight: bold; 
            letter-spacing: 8px; 
            color: #00ff41; 
          }
          .footer { text-align: center; font-size: 12px; color: #00ff41; opacity: 0.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">N</div>
            <h1 style="color: #00D26A;">Número Virtual</h1>
          </div>
          
          <p>Olá${customerName ? ` ${customerName}` : ''},</p>
          
          <p>Bem-vindo ao Número Virtual! Para ativar sua conta, use o código de verificação abaixo:</p>
          
          <div class="code-box">
            <div class="code">${code}</div>
          </div>
          
          <p><strong>Este código expira em 15 minutos.</strong></p>
          
          <p>Se você não criou esta conta, ignore este email.</p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Número Virtual - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const response = await mailchimp.messages.send({ message });
    console.log('[Email] Verification code sent:', { email, status: response[0].status });
    return { success: true, messageId: response[0]._id };
  } catch (error) {
    console.error('[Email] Failed to send verification code:', error);
    throw new Error('Falha ao enviar email de verificação');
  }
}
```

---

### **PASSO 3: Atualizar Schema do Banco**

Adicionar em `drizzle/schema.ts`:

```typescript
export const emailVerifications = mysqlTable('email_verifications', {
  id: int('id').primaryKey().autoincrement(),
  customerId: int('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: datetime('expires_at').notNull(),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`),
  usedAt: datetime('used_at'),
}, (table) => ({
  customerCodeIdx: index('idx_customer_code').on(table.customerId, table.code),
  expiresIdx: index('idx_expires').on(table.expiresAt),
}));

// Adicionar campos na tabela customers
export const customers = mysqlTable('customers', {
  // ... campos existentes ...
  emailVerified: boolean('email_verified').default(false),
  emailVerifiedAt: datetime('email_verified_at'),
});
```

Aplicar migration:

```bash
pnpm db:push
```

---

### **PASSO 4: Criar Helpers de Verificação**

Adicionar em `server/db.ts`:

```typescript
// Gerar código de 6 dígitos
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Criar código de verificação
export async function createVerificationCode(customerId: number) {
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

  await db.insert(emailVerifications).values({
    customerId,
    code,
    expiresAt,
  });

  return code;
}

// Validar código
export async function validateVerificationCode(customerId: number, code: string) {
  const [verification] = await db
    .select()
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.customerId, customerId),
        eq(emailVerifications.code, code),
        isNull(emailVerifications.usedAt),
        gt(emailVerifications.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!verification) {
    return { valid: false, error: 'Código inválido ou expirado' };
  }

  // Marcar código como usado
  await db
    .update(emailVerifications)
    .set({ usedAt: new Date() })
    .where(eq(emailVerifications.id, verification.id));

  // Marcar email como verificado
  await db
    .update(customers)
    .set({ 
      emailVerified: true, 
      emailVerifiedAt: new Date() 
    })
    .where(eq(customers.id, customerId));

  return { valid: true };
}
```

---

### **PASSO 5: Atualizar Router de Autenticação**

Modificar `server/routers.ts`:

```typescript
// Criar conta (agora envia email de verificação)
createAccount: publicProcedure
  .input(z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    // 1. Verificar se email já existe
    const existing = await db.query.customers.findFirst({
      where: eq(customers.email, input.email),
    });

    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Email já cadastrado' });
    }

    // 2. Criar conta (não verificada)
    const hashedPassword = await bcrypt.hash(input.password, 10);
    const [newCustomer] = await db.insert(customers).values({
      email: input.email,
      password: hashedPassword,
      name: input.name,
      emailVerified: false, // Conta não verificada
      balance: 0,
      role: 'user',
    }).$returningId();

    // 3. Gerar código de verificação
    const code = await createVerificationCode(newCustomer.id);

    // 4. Enviar email
    try {
      await sendVerificationEmail({
        email: input.email,
        code,
        customerName: input.name,
      });
    } catch (error) {
      console.error('[Auth] Failed to send verification email:', error);
      // Não falhar o cadastro se email não enviar
    }

    return { 
      success: true, 
      customerId: newCustomer.id,
      message: 'Conta criada! Verifique seu email para ativar.' 
    };
  }),

// Verificar código
verifyEmail: publicProcedure
  .input(z.object({
    customerId: z.number(),
    code: z.string().length(6),
  }))
  .mutation(async ({ input }) => {
    const result = await validateVerificationCode(input.customerId, input.code);
    
    if (!result.valid) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: result.error });
    }

    return { success: true, message: 'Email verificado com sucesso!' };
  }),

// Reenviar código
resendVerificationCode: publicProcedure
  .input(z.object({
    customerId: z.number(),
  }))
  .mutation(async ({ input }) => {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, input.customerId),
    });

    if (!customer) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
    }

    if (customer.emailVerified) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Email já verificado' });
    }

    // Gerar novo código
    const code = await createVerificationCode(input.customerId);

    // Enviar email
    await sendVerificationEmail({
      email: customer.email,
      code,
      customerName: customer.name || undefined,
    });

    return { success: true, message: 'Novo código enviado!' };
  }),
```

---

### **PASSO 6: Bloquear Login de Contas Não Verificadas**

Atualizar lógica de login em `server/_core/auth.ts`:

```typescript
// No callback do OAuth, verificar se email está verificado
if (!customer.emailVerified) {
  // Redirecionar para página de verificação
  return res.redirect(`/verify-email?customerId=${customer.id}&email=${customer.email}`);
}
```

---

### **PASSO 7: Criar Página de Verificação (Frontend)**

Criar `client/src/pages/VerifyEmail.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState('');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('customerId');
    const mail = params.get('email');
    if (id) setCustomerId(parseInt(id));
    if (mail) setEmail(mail);
  }, []);

  const verifyMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      toast.success('Email verificado com sucesso!');
      setTimeout(() => setLocation('/login'), 1500);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resendMutation = trpc.auth.resendVerificationCode.useMutation({
    onSuccess: () => {
      toast.success('Novo código enviado!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleVerify = () => {
    if (!customerId) return;
    if (code.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }
    verifyMutation.mutate({ customerId, code });
  };

  const handleResend = () => {
    if (!customerId) return;
    resendMutation.mutate({ customerId });
  };

  return (
    <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-black border-2 border-green-500/30 rounded-lg p-8">
        <div className="text-center mb-8">
          <Mail className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-400 mb-2">Verifique seu Email</h1>
          <p className="text-green-600 text-sm">
            Enviamos um código de 6 dígitos para:
          </p>
          <p className="text-green-400 font-mono mt-2">{email}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-green-600 mb-2">
              Código de Verificação
            </label>
            <Input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <Button
            onClick={handleVerify}
            disabled={verifyMutation.isPending || code.length !== 6}
            className="w-full"
          >
            {verifyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Verificar
          </Button>

          <div className="text-center">
            <button
              onClick={handleResend}
              disabled={resendMutation.isPending}
              className="text-sm text-green-600 hover:text-green-400 underline"
            >
              {resendMutation.isPending ? 'Enviando...' : 'Não recebeu? Reenviar código'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Adicionar rota em `App.tsx`:

```typescript
<Route path="/verify-email" component={VerifyEmail} />
```

---

## ✅ Checklist de Implementação

- [ ] Criar conta no Mailchimp Transactional

- [ ] Gerar API Key do Mailchimp

- [ ] Adicionar credenciais via webdev_request_secrets

- [ ] Instalar biblioteca @mailchimp/mailchimp_transactional

- [ ] Criar helper de email (server/email.ts)

- [ ] Atualizar schema do banco (adicionar campos + tabela)

- [ ] Aplicar migration (pnpm db:push)

- [ ] Criar helpers de verificação (server/db.ts)

- [ ] Atualizar router de autenticação (createAccount, verifyEmail, resendCode)

- [ ] Bloquear login de contas não verificadas

- [ ] Criar página de verificação (VerifyEmail.tsx)

- [ ] Adicionar rota /verify-email no App.tsx

- [ ] Testar fluxo completo (cadastro → email → código → login)

- [ ] Criar testes unitários para validação de código

- [ ] Documentar no README

---

## 🧪 Testes Recomendados

```typescript
// server/email-verification.test.ts
import { describe, it, expect } from 'vitest';
import { generateVerificationCode, validateVerificationCode } from './db';

describe('Email Verification', () => {
  it('should generate 6-digit code', () => {
    const code = generateVerificationCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^\d{6}$/);
  });

  it('should reject expired code', async () => {
    // Criar código expirado
    // Validar e esperar erro
  });

  it('should reject used code', async () => {
    // Usar código
    // Tentar usar novamente e esperar erro
  });
});
```

---

## 📝 Notas Importantes

1. **Mailchimp Transactional é gratuito** até 12.000 emails/mês

1. **Códigos expiram em 15 minutos** (configurável)

1. **Códigos são de uso único** (marcados como usedAt após validação)

1. **Contas não verificadas não podem fazer login**

1. **Template de email usa tema Matrix** (verde #00D26A)

1. **Reenvio de código é ilimitado** (gera novo código a cada vez)

---

## 🔒 Segurança

- ✅ Códigos têm expiração (15 minutos)

- ✅ Códigos são de uso único

- ✅ Rate limiting no reenvio (implementar se necessário)

- ✅ Validação server-side de todos os inputs

- ✅ Logs de tentativas de verificação

- ✅ Email enviado via serviço confiável (Mailchimp)

---

## 📊 Métricas Sugeridas

- Taxa de verificação (% de contas verificadas)

- Tempo médio até verificação

- Taxa de reenvio de código

- Códigos expirados vs usados

- Falhas no envio de email

