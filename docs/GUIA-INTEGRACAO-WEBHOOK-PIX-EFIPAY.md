# Guia Completo de Integração Webhook PIX EfiPay

**Autor:** Manus AI  
**Data:** Dezembro 2024  
**Versão:** 1.0

---

## 📋 Sumário

1. [Introdução](#introdução)
2. [Problema Crítico Identificado](#problema-crítico-identificado)
3. [Pré-requisitos](#pré-requisitos)
4. [Configuração Passo a Passo](#configuração-passo-a-passo)
5. [Implementação do Código](#implementação-do-código)
6. [Checklist de Validação](#checklist-de-validação)
7. [Troubleshooting](#troubleshooting)
8. [Exemplos de Código Completos](#exemplos-de-código-completos)
9. [Referências](#referências)

---

## 🎯 Introdução

Este documento descreve o processo completo de integração do webhook PIX da **EfiPay** (antiga Gerencianet) em aplicações Node.js/Express. O guia foi criado após identificar e resolver problemas críticos que impediam o funcionamento correto do webhook em produção.

A integração correta do webhook PIX é essencial para que pagamentos sejam creditados automaticamente na conta do cliente, sem necessidade de intervenção manual. Quando o webhook não funciona, os pagamentos ficam pendentes indefinidamente, causando frustração aos clientes e perda de receita.

---

## 🚨 Problema Crítico Identificado

### O Bug Silencioso da EfiPay

Durante a implementação, identificamos um comportamento não documentado da EfiPay que causava erro 404 em todos os webhooks:

**A EfiPay adiciona automaticamente `/pix` ao final da URL do webhook quando envia notificações reais de pagamento.**

#### Exemplo do Problema

```
URL cadastrada no painel EfiPay:
https://app.numero-virtual.com/api/webhook/pix

URL que a EfiPay REALMENTE chama:
https://app.numero-virtual.com/api/webhook/pix/pix ❌ (404 Not Found)
```

#### Por Que Isso Acontece?

A EfiPay possui dois tipos de chamadas ao webhook:

1. **Teste de configuração:** Chama a URL exatamente como cadastrada
2. **Notificação real de pagamento:** Adiciona `/pix` automaticamente ao final

Isso significa que o teste de configuração passa com sucesso (HTTP 200), mas as notificações reais falham silenciosamente com erro 404. O desenvolvedor acredita que o webhook está funcionando, mas na prática nenhum pagamento é processado automaticamente.

#### A Solução Oficial

Após análise da documentação oficial da EfiPay, descobrimos que existe um workaround documentado mas pouco conhecido: adicionar `?ignorar=` ao final da URL.

```
URL corrigida:
https://app.numero-virtual.com/api/webhook/pix?ignorar=

Como funciona:
- Teste de configuração: /api/webhook/pix?ignorar= ✅
- Notificação real: /api/webhook/pix?ignorar=/pix ✅
```

Ambas as chamadas chegam na mesma rota porque o Express ignora query parameters por padrão. O parâmetro `?ignorar=` serve apenas para "absorver" o `/pix` adicional que a EfiPay concatena.

---

## 📦 Pré-requisitos

Antes de iniciar a integração, certifique-se de ter:

### 1. Conta EfiPay Configurada

- Conta criada no [portal da EfiPay](https://sejaefi.com.br)
- Ambiente de produção ativado (não sandbox)
- Chave PIX cadastrada e ativa
- Certificado digital baixado (arquivo `.p12`)

### 2. Credenciais de API

Você precisará de três informações críticas:

```bash
EFIPAY_CLIENT_ID_PROD=Client_Id_xxxxxxxxxxxxxxxxxxxxxxxx
EFIPAY_CLIENT_SECRET_PROD=Client_Secret_xxxxxxxxxxxxxxxxxxxxxxxx
EFIPAY_PIX_KEY=sua-chave-pix-uuid
```

**Como obter:**
1. Acesse o painel EfiPay
2. Vá em **Configurações → API**
3. Copie o Client ID e Client Secret
4. Vá em **PIX → Minhas Chaves**
5. Copie a chave PIX (formato UUID)

### 3. Certificado Digital

O certificado `.p12` é obrigatório para autenticação na API EfiPay.

**Como configurar:**

```bash
# Converter .p12 para .pem (se necessário)
openssl pkcs12 -in certificado.p12 -out certificado.pem -nodes

# Salvar no projeto
mkdir -p certs
cp certificado.p12 certs/efipay-prod.p12
```

### 4. Domínio HTTPS Válido

A EfiPay **exige HTTPS** para webhooks em produção. Certifique-se de que:

- Seu domínio possui certificado SSL válido
- O webhook está acessível externamente
- Não há firewall bloqueando requisições da EfiPay

**Teste de acessibilidade:**

```bash
curl -X POST https://seu-dominio.com/api/webhook/pix?ignorar= \
  -H "Content-Type: application/json" \
  -d '{}'
```

Resposta esperada: `HTTP 200 OK`

---

## 🔧 Configuração Passo a Passo

### Passo 1: Instalar Dependências

```bash
npm install sdk-node-apis-efi
```

### Passo 2: Configurar Variáveis de Ambiente

Crie ou atualize seu arquivo `.env`:

```bash
# EfiPay - Produção
EFIPAY_CLIENT_ID_PROD=Client_Id_xxxxxxxxxxxxxxxxxxxxxxxx
EFIPAY_CLIENT_SECRET_PROD=Client_Secret_xxxxxxxxxxxxxxxxxxxxxxxx
EFIPAY_PIX_KEY=f2ba920b-7f59-496b-abf1-859b7b90e435
EFIPAY_ENVIRONMENT=production

# Certificado
EFIPAY_CERT_PATH=./certs/efipay-prod.p12
```

### Passo 3: Criar Cliente EfiPay

Crie o arquivo `server/efipay-client.ts`:

```typescript
import EfiPay from 'sdk-node-apis-efi';
import path from 'path';
import fs from 'fs';

const certPath = path.resolve(process.cwd(), process.env.EFIPAY_CERT_PATH || './certs/efipay-prod.p12');

if (!fs.existsSync(certPath)) {
  throw new Error(`EfiPay certificate not found at: ${certPath}`);
}

const options = {
  client_id: process.env.EFIPAY_CLIENT_ID_PROD,
  client_secret: process.env.EFIPAY_CLIENT_SECRET_PROD,
  certificate: certPath,
  sandbox: process.env.EFIPAY_ENVIRONMENT !== 'production',
};

export const efipay = new EfiPay(options);
```

### Passo 4: Implementar Router do Webhook

⚠️ **ATENÇÃO:** O webhook PIX deve ser registrado **ANTES** do `express.json()` para preservar o body raw.

Crie o arquivo `server/webhook-pix.ts`:

```typescript
import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { pixTransactions, customers, balanceTransactions, recharges } from '../drizzle/schema';
import { efipay } from './efipay-client';

const router = Router();

// Middleware para processar JSON apenas nesta rota
router.use(express.json());

router.post('/api/webhook/pix', async (req, res) => {
  console.log('[Webhook PIX] Received notification');
  console.log('[Webhook PIX] Body:', JSON.stringify(req.body, null, 2));

  try {
    // 1. Validar payload
    if (!req.body || !req.body.pix) {
      console.log('[Webhook PIX] Empty payload - configuration test');
      return res.status(200).json({ received: true });
    }

    const { pix } = req.body;
    const txid = pix[0]?.txid;

    if (!txid) {
      console.error('[Webhook PIX] Missing txid in payload');
      return res.status(400).json({ error: 'Missing txid' });
    }

    console.log(`[Webhook PIX] Processing txid: ${txid}`);

    // 2. Buscar transação no banco
    const [transaction] = await db
      .select()
      .from(pixTransactions)
      .where(eq(pixTransactions.txid, txid))
      .limit(1);

    if (!transaction) {
      console.error(`[Webhook PIX] Transaction not found: ${txid}`);
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === 'paid') {
      console.log(`[Webhook PIX] Transaction already paid: ${txid}`);
      return res.status(200).json({ received: true, message: 'Already processed' });
    }

    // 3. Buscar detalhes do pagamento na EfiPay
    const pixData = await efipay.pixDetailCharge({ txid });

    if (pixData.status !== 'CONCLUIDA') {
      console.log(`[Webhook PIX] Payment not completed yet: ${pixData.status}`);
      return res.status(200).json({ received: true, message: 'Payment pending' });
    }

    console.log(`[Webhook PIX] Payment confirmed: R$ ${transaction.amount / 100}`);

    const now = new Date();

    // 4. Atualizar status da transação
    await db
      .update(pixTransactions)
      .set({
        status: 'paid',
        paidAt: pixData.pix[0].horario,
        updatedAt: now,
      })
      .where(eq(pixTransactions.id, transaction.id));

    // 5. Creditar saldo do cliente
    await db
      .update(customers)
      .set({
        balance: sql`balance + ${transaction.amount}`,
      })
      .where(eq(customers.id, transaction.customerId));

    // 6. Criar registro em balance_transactions
    await db.insert(balanceTransactions).values({
      customerId: transaction.customerId,
      amount: transaction.amount,
      type: 'credit',
      description: `Recarga PIX - ${txid}`,
      createdAt: now,
    });

    // 7. Criar registro em recharges
    // ⚠️ IMPORTANTE: NÃO passar updatedAt manualmente
    await db.insert(recharges).values({
      customerId: transaction.customerId,
      amount: transaction.amount,
      paymentMethod: 'pix',
      status: 'completed',
      transactionId: txid,
      completedAt: pixData.pix[0].horario,
      createdAt: now,
      // updatedAt is auto-managed by .onUpdateNow() in schema - do NOT pass manually
    });

    console.log(`[Webhook PIX] Successfully processed: ${txid}`);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Webhook PIX] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### Passo 5: Registrar Webhook no Express

⚠️ **CRÍTICO:** O webhook PIX deve ser registrado **ANTES** do `express.json()`.

Edite o arquivo `server/_core/index.ts`:

```typescript
import express from 'express';
import pixWebhookRouter from '../webhook-pix';

const app = express();

// ⚠️ IMPORTANTE: Registrar webhook PIX ANTES do express.json()
app.use('/api', pixWebhookRouter);

// Agora sim, registrar body parser global
app.use(express.json());

// ... resto das rotas
```

**Por quê?**

O `express.json()` consome o body da requisição. Se ele for executado antes do webhook, o `req.body` chegará vazio no handler do webhook, causando erro 500.

### Passo 6: Configurar Webhook na EfiPay

Crie o script `scripts/setup-webhook.ts`:

```typescript
import { efipay } from '../server/efipay-client';

async function setupWebhook() {
  try {
    const pixKey = process.env.EFIPAY_PIX_KEY!;
    
    // ⚠️ IMPORTANTE: Adicionar ?ignorar= ao final da URL
    const webhookUrl = 'https://seu-dominio.com/api/webhook/pix?ignorar=';

    console.log('Configurando webhook PIX...');
    console.log('Chave PIX:', pixKey);
    console.log('URL do webhook:', webhookUrl);

    const response = await efipay.pixConfigWebhook({
      chave: pixKey,
      body: {
        webhookUrl,
      },
    });

    console.log('✅ Webhook configurado com sucesso!');
    console.log('Resposta:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('❌ Erro ao configurar webhook:', error);
    process.exit(1);
  }
}

setupWebhook();
```

**Executar:**

```bash
npx tsx scripts/setup-webhook.ts
```

**Saída esperada:**

```
Configurando webhook PIX...
Chave PIX: f2ba920b-7f59-496b-abf1-859b7b90e435
URL do webhook: https://seu-dominio.com/api/webhook/pix?ignorar=
✅ Webhook configurado com sucesso!
```

---

## ✅ Checklist de Validação

Use este checklist para garantir que a integração está completa:

### Configuração Básica

- [ ] Credenciais EfiPay configuradas (Client ID, Client Secret, PIX Key)
- [ ] Certificado `.p12` salvo no diretório `certs/`
- [ ] Variáveis de ambiente configuradas no `.env`
- [ ] Cliente EfiPay criado e testado
- [ ] Domínio HTTPS válido e acessível

### Implementação do Código

- [ ] Router do webhook criado (`server/webhook-pix.ts`)
- [ ] Webhook registrado **ANTES** do `express.json()`
- [ ] Middleware `express.json()` adicionado ao router do webhook
- [ ] Validação de payload implementada
- [ ] Lógica de crédito de saldo implementada
- [ ] Registros em `balance_transactions` e `recharges` criados
- [ ] Campo `updatedAt` **NÃO** passado manualmente no insert de `recharges`

### Configuração do Webhook

- [ ] Script `setup-webhook.ts` criado
- [ ] URL do webhook contém `?ignorar=` ao final
- [ ] Webhook configurado na EfiPay com sucesso
- [ ] Teste de acessibilidade externa passou (curl retorna HTTP 200)

### Testes

- [ ] Teste manual com curl funcionou
- [ ] Pagamento PIX real foi processado automaticamente
- [ ] Saldo foi creditado corretamente
- [ ] Registro apareceu no histórico de recargas
- [ ] Logs do servidor mostram processamento correto

---

## 🔍 Troubleshooting

### Problema 1: Webhook Retorna 404

**Sintomas:**
- Teste de configuração passa (HTTP 200)
- Pagamentos reais não são processados
- Logs da EfiPay mostram erro 404

**Causa:**
URL do webhook não contém `?ignorar=` ao final.

**Solução:**
```bash
# URL incorreta
https://seu-dominio.com/api/webhook/pix

# URL correta
https://seu-dominio.com/api/webhook/pix?ignorar=
```

Reconfigure o webhook:
```bash
npx tsx scripts/setup-webhook.ts
```

---

### Problema 2: Webhook Retorna 500 (req.body undefined)

**Sintomas:**
- Webhook é chamado mas retorna erro 500
- Logs mostram `req.body` undefined
- Nenhum pagamento é processado

**Causa:**
Webhook registrado **DEPOIS** do `express.json()`, causando consumo do body antes de chegar no handler.

**Solução:**

Edite `server/_core/index.ts` e mova o registro do webhook para **ANTES** do `express.json()`:

```typescript
// ❌ ERRADO
app.use(express.json());
app.use('/api', pixWebhookRouter); // Body já foi consumido

// ✅ CORRETO
app.use('/api', pixWebhookRouter); // Body ainda intacto
app.use(express.json());
```

---

### Problema 3: Recargas Não Aparecem no Histórico

**Sintomas:**
- Pagamento é processado
- Saldo é creditado
- Registro não aparece em `/store/recharges`

**Causa:**
Campo `updatedAt` sendo passado manualmente no insert de `recharges`, causando conflito com `.onUpdateNow()` no schema.

**Solução:**

Remova `updatedAt` do insert:

```typescript
// ❌ ERRADO
await db.insert(recharges).values({
  customerId: transaction.customerId,
  amount: transaction.amount,
  paymentMethod: 'pix',
  status: 'completed',
  transactionId: txid,
  completedAt: pixData.pix[0].horario,
  createdAt: now,
  updatedAt: now, // ❌ CONFLITO com .onUpdateNow()
});

// ✅ CORRETO
await db.insert(recharges).values({
  customerId: transaction.customerId,
  amount: transaction.amount,
  paymentMethod: 'pix',
  status: 'completed',
  transactionId: txid,
  completedAt: pixData.pix[0].horario,
  createdAt: now,
  // updatedAt is auto-managed by .onUpdateNow() in schema
});
```

---

### Problema 4: Cloudflare Bloqueando Webhooks

**Sintomas:**
- Teste com curl funciona localmente
- Webhook não funciona em produção
- Logs da Cloudflare mostram bloqueios

**Causa:**
Cloudflare WAF bloqueando requisições da EfiPay.

**Solução:**

1. Acesse o painel da Cloudflare
2. Vá em **Security → WAF**
3. Crie regra de exceção:

```
Field: URI Path
Operator: equals
Value: /api/webhook/pix
Action: Skip (All WAF rules)
```

4. Salve e aguarde 2-3 minutos para propagar

---

### Problema 5: Certificado SSL Inválido

**Sintomas:**
- Erro: `unable to verify the first certificate`
- Webhook não funciona em produção

**Causa:**
Certificado SSL do domínio inválido ou expirado.

**Solução:**

Verifique o certificado:

```bash
openssl s_client -connect seu-dominio.com:443 -servername seu-dominio.com
```

Se inválido, renove via Let's Encrypt:

```bash
sudo certbot renew
```

---

## 📝 Exemplos de Código Completos

### Exemplo 1: Cliente EfiPay Completo

```typescript
// server/efipay-client.ts
import EfiPay from 'sdk-node-apis-efi';
import path from 'path';
import fs from 'fs';

const certPath = path.resolve(
  process.cwd(),
  process.env.EFIPAY_CERT_PATH || './certs/efipay-prod.p12'
);

if (!fs.existsSync(certPath)) {
  throw new Error(`EfiPay certificate not found at: ${certPath}`);
}

const options = {
  client_id: process.env.EFIPAY_CLIENT_ID_PROD,
  client_secret: process.env.EFIPAY_CLIENT_SECRET_PROD,
  certificate: certPath,
  sandbox: process.env.EFIPAY_ENVIRONMENT !== 'production',
};

export const efipay = new EfiPay(options);

// Função auxiliar para criar cobrança PIX
export async function createPixCharge(params: {
  amount: number; // em centavos
  customerId: number;
  customerEmail: string;
}) {
  const { amount, customerId, customerEmail } = params;

  const body = {
    calendario: {
      expiracao: 3600, // 1 hora
    },
    devedor: {
      email: customerEmail,
    },
    valor: {
      original: (amount / 100).toFixed(2), // Converter centavos para reais
    },
    chave: process.env.EFIPAY_PIX_KEY,
    solicitacaoPagador: 'Recarga de saldo',
  };

  const response = await efipay.pixCreateImmediateCharge({}, body);

  return {
    txid: response.txid,
    qrCode: response.pixCopiaECola,
    qrCodeImage: response.imagemQrcode,
  };
}
```

### Exemplo 2: Fluxo Completo de Pagamento PIX

```typescript
// server/routers/pix.ts
import { Router } from 'express';
import { z } from 'zod';
import { createPixCharge } from '../efipay-client';
import { db } from '../db';
import { pixTransactions, customers } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Criar cobrança PIX
router.post('/api/pix/create-charge', async (req, res) => {
  try {
    const schema = z.object({
      customerId: z.number(),
      amount: z.number().min(100), // Mínimo R$ 1,00
    });

    const { customerId, amount } = schema.parse(req.body);

    // Buscar cliente
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Criar cobrança na EfiPay
    const charge = await createPixCharge({
      amount,
      customerId,
      customerEmail: customer.email,
    });

    // Salvar transação no banco
    await db.insert(pixTransactions).values({
      customerId,
      amount,
      txid: charge.txid,
      status: 'pending',
      qrCode: charge.qrCode,
      qrCodeImage: charge.qrCodeImage,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hora
    });

    res.json({
      txid: charge.txid,
      qrCode: charge.qrCode,
      qrCodeImage: charge.qrCodeImage,
    });
  } catch (error) {
    console.error('[PIX] Error creating charge:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### Exemplo 3: Script de Verificação de Webhook

```typescript
// scripts/check-webhook.ts
import { efipay } from '../server/efipay-client';

async function checkWebhook() {
  try {
    const pixKey = process.env.EFIPAY_PIX_KEY!;

    console.log('Verificando webhook configurado...');
    console.log('Chave PIX:', pixKey);

    const response = await efipay.pixDetailWebhook({ chave: pixKey });

    console.log('\n✅ Webhook encontrado:');
    console.log('URL:', response.webhookUrl);
    console.log('Criado em:', response.criacao);

    if (response.webhookUrl.includes('?ignorar=')) {
      console.log('\n✅ URL contém ?ignorar= (correto)');
    } else {
      console.log('\n⚠️  URL NÃO contém ?ignorar= (pode causar erro 404)');
      console.log('Execute: npx tsx scripts/setup-webhook.ts');
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Não foi possível conectar à API da EfiPay');
    } else if (error.message?.includes('404')) {
      console.log('⚠️  Nenhum webhook configurado para esta chave PIX');
      console.log('Execute: npx tsx scripts/setup-webhook.ts');
    } else {
      console.error('❌ Erro:', error);
    }
  }
}

checkWebhook();
```

### Exemplo 4: Script de Crédito Manual de Transações Pendentes

```typescript
// scripts/credit-pending-pix.ts
import { db } from '../server/db';
import { pixTransactions, customers, balanceTransactions, recharges } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { efipay } from '../server/efipay-client';

async function creditPendingTransactions() {
  try {
    console.log('Buscando transações PIX pendentes...\n');

    const pending = await db
      .select()
      .from(pixTransactions)
      .where(eq(pixTransactions.status, 'pending'));

    if (pending.length === 0) {
      console.log('✅ Nenhuma transação pendente encontrada');
      return;
    }

    console.log(`Encontradas ${pending.length} transações pendentes\n`);

    for (const transaction of pending) {
      try {
        console.log(`Processando txid: ${transaction.txid}`);

        // Verificar status na EfiPay
        const pixData = await efipay.pixDetailCharge({ txid: transaction.txid });

        if (pixData.status !== 'CONCLUIDA') {
          console.log(`  ⏳ Status: ${pixData.status} (ainda não pago)\n`);
          continue;
        }

        console.log(`  ✅ Pagamento confirmado: R$ ${transaction.amount / 100}`);

        const now = new Date();

        // Atualizar status
        await db
          .update(pixTransactions)
          .set({
            status: 'paid',
            paidAt: pixData.pix[0].horario,
            updatedAt: now,
          })
          .where(eq(pixTransactions.id, transaction.id));

        // Creditar saldo
        await db
          .update(customers)
          .set({
            balance: sql`balance + ${transaction.amount}`,
          })
          .where(eq(customers.id, transaction.customerId));

        // Criar registro em balance_transactions
        await db.insert(balanceTransactions).values({
          customerId: transaction.customerId,
          amount: transaction.amount,
          type: 'credit',
          description: `Recarga PIX - ${transaction.txid}`,
          createdAt: now,
        });

        // Criar registro em recharges
        await db.insert(recharges).values({
          customerId: transaction.customerId,
          amount: transaction.amount,
          paymentMethod: 'pix',
          status: 'completed',
          transactionId: transaction.txid,
          completedAt: pixData.pix[0].horario,
          createdAt: now,
        });

        console.log(`  ✅ Saldo creditado com sucesso\n`);
      } catch (error) {
        console.error(`  ❌ Erro ao processar ${transaction.txid}:`, error, '\n');
      }
    }

    console.log('✅ Processamento concluído');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

creditPendingTransactions();
```

---

## 📚 Referências

1. [Documentação Oficial EfiPay - Webhooks PIX](https://dev.efipay.com.br/docs/api-pix/webhooks)
2. [SDK Node.js EfiPay](https://github.com/efipay/sdk-node-apis-efi)
3. [Express.js - Body Parser](https://expressjs.com/en/api.html#express.json)
4. [Drizzle ORM - Schema Definition](https://orm.drizzle.team/docs/sql-schema-declaration)

---

## 📞 Suporte

Se encontrar problemas não cobertos neste guia:

1. Verifique os logs do servidor em tempo real
2. Teste o webhook manualmente com curl
3. Verifique o painel da EfiPay para logs de webhook
4. Entre em contato com o suporte da EfiPay: suporte@sejaefi.com.br

---

**Última atualização:** Dezembro 2024  
**Versão do documento:** 1.0  
**Autor:** Manus AI
