# Checklist Rápido: Webhook PIX EfiPay

**Use este checklist para diagnosticar problemas rapidamente**

---

## 🚀 Checklist de Implementação Inicial

### 1. Credenciais e Certificado

```bash
# Verificar variáveis de ambiente
[ ] EFIPAY_CLIENT_ID_PROD está definido
[ ] EFIPAY_CLIENT_SECRET_PROD está definido
[ ] EFIPAY_PIX_KEY está definido (formato UUID)
[ ] EFIPAY_ENVIRONMENT=production
[ ] EFIPAY_CERT_PATH aponta para certificado .p12 válido

# Testar certificado
[ ] Arquivo .p12 existe no caminho especificado
[ ] Certificado não está expirado
[ ] Certificado é do ambiente correto (produção)
```

### 2. Código do Webhook

```bash
# Estrutura do código
[ ] Router do webhook criado (server/webhook-pix.ts)
[ ] express.json() adicionado ao router
[ ] Webhook registrado ANTES do express.json() global
[ ] Validação de payload implementada
[ ] Lógica de crédito de saldo implementada
[ ] Campo updatedAt NÃO é passado manualmente no insert de recharges

# Ordem de registro no Express
[ ] 1º: app.use('/api', pixWebhookRouter)
[ ] 2º: app.use(express.json())
[ ] 3º: Outras rotas
```

### 3. Configuração do Webhook na EfiPay

```bash
# URL do webhook
[ ] URL usa HTTPS (obrigatório em produção)
[ ] URL contém ?ignorar= ao final
[ ] URL é acessível externamente (teste com curl)
[ ] Script setup-webhook.ts executado com sucesso
[ ] Webhook aparece no painel da EfiPay
```

### 4. Testes

```bash
# Teste manual
[ ] curl -X POST https://seu-dominio.com/api/webhook/pix?ignorar= retorna HTTP 200
[ ] Logs do servidor mostram "[Webhook PIX] Received notification"

# Teste real
[ ] Criar cobrança PIX de teste (R$ 0,01)
[ ] Pagar via app bancário
[ ] Aguardar 5-10 segundos
[ ] Verificar logs do servidor
[ ] Verificar saldo creditado
[ ] Verificar registro em /store/recharges
```

---

## 🔍 Diagnóstico Rápido de Problemas

### Sintoma: Webhook retorna 404

**Checklist de diagnóstico:**

```bash
[ ] URL do webhook contém ?ignorar= ao final?
   ❌ https://app.com/api/webhook/pix
   ✅ https://app.com/api/webhook/pix?ignorar=

[ ] Rota está registrada no Express?
   Verificar: server/_core/index.ts

[ ] Servidor está rodando?
   Testar: curl https://seu-dominio.com/health

[ ] Firewall/WAF não está bloqueando?
   Verificar: Cloudflare, AWS WAF, etc.
```

**Solução rápida:**

```bash
# Reconfigurar webhook com URL correta
npx tsx scripts/setup-webhook.ts

# Verificar webhook configurado
npx tsx scripts/check-webhook.ts
```

---

### Sintoma: Webhook retorna 500

**Checklist de diagnóstico:**

```bash
[ ] req.body está undefined?
   Causa: Webhook registrado DEPOIS do express.json()
   
[ ] Erro de banco de dados?
   Verificar: Conexão com MySQL/TiDB
   
[ ] Erro de autenticação EfiPay?
   Verificar: Credenciais e certificado
   
[ ] Campo updatedAt causando conflito?
   Verificar: Insert em recharges não deve passar updatedAt
```

**Solução rápida:**

```typescript
// ❌ ERRADO
app.use(express.json());
app.use('/api', pixWebhookRouter);

// ✅ CORRETO
app.use('/api', pixWebhookRouter);
app.use(express.json());
```

---

### Sintoma: Pagamento não credita automaticamente

**Checklist de diagnóstico:**

```bash
[ ] Webhook está sendo chamado?
   Verificar: Logs do servidor

[ ] Transação existe no banco?
   SELECT * FROM pix_transactions WHERE txid = 'xxx';

[ ] Status na EfiPay é CONCLUIDA?
   Testar: npx tsx scripts/check-payment.ts <txid>

[ ] Lógica de crédito está correta?
   Verificar: 4 operações no banco (update pix_transactions, update customers, insert balance_transactions, insert recharges)
```

**Solução rápida:**

```bash
# Creditar transações pendentes manualmente
npx tsx scripts/credit-pending-pix.ts
```

---

### Sintoma: Recarga não aparece no histórico

**Checklist de diagnóstico:**

```bash
[ ] Registro foi criado em recharges?
   SELECT * FROM recharges WHERE transaction_id = 'xxx';

[ ] Campo updatedAt foi passado manualmente?
   ❌ updatedAt: now (causa conflito com .onUpdateNow())
   ✅ Remover updatedAt do insert

[ ] Query da página /store/recharges está correta?
   Verificar: ORDER BY created_at DESC
```

**Solução rápida:**

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
  updatedAt: now, // ❌ REMOVER
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
  // updatedAt is auto-managed
});
```

---

## 📊 Tabela de Erros Comuns

| Erro | Causa | Solução | Tempo de Fix |
|------|-------|---------|--------------|
| **404 Not Found** | URL sem `?ignorar=` | Adicionar `?ignorar=` e reconfigurar webhook | 2 min |
| **500 Internal Server Error** | Webhook após `express.json()` | Mover registro do webhook para antes | 1 min |
| **req.body undefined** | Body consumido antes de chegar no handler | Adicionar `express.json()` ao router do webhook | 2 min |
| **Saldo não creditado** | Lógica de crédito incompleta | Verificar 4 operações no banco | 5 min |
| **Histórico vazio** | `updatedAt` passado manualmente | Remover `updatedAt` do insert | 1 min |
| **Cloudflare bloqueando** | WAF bloqueando EfiPay | Criar regra de exceção no WAF | 3 min |
| **Certificado inválido** | Certificado expirado ou errado | Baixar novo certificado do painel EfiPay | 5 min |
| **Credenciais inválidas** | Client ID/Secret errados | Copiar credenciais corretas do painel | 2 min |

---

## 🧪 Scripts de Teste Úteis

### 1. Testar Acessibilidade do Webhook

```bash
#!/bin/bash
# test-webhook-access.sh

URL="https://seu-dominio.com/api/webhook/pix?ignorar="

echo "Testando acessibilidade do webhook..."
echo "URL: $URL"
echo ""

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{}')

if [ "$RESPONSE" = "200" ]; then
  echo "✅ Webhook acessível (HTTP $RESPONSE)"
else
  echo "❌ Erro: HTTP $RESPONSE"
fi
```

### 2. Verificar Webhook Configurado

```bash
# Executar
npx tsx scripts/check-webhook.ts

# Saída esperada
✅ Webhook encontrado:
URL: https://seu-dominio.com/api/webhook/pix?ignorar=
Criado em: 2024-12-08T10:30:00Z
✅ URL contém ?ignorar= (correto)
```

### 3. Creditar Transações Pendentes

```bash
# Executar
npx tsx scripts/credit-pending-pix.ts

# Saída esperada
Encontradas 3 transações pendentes

Processando txid: abc123...
  ✅ Pagamento confirmado: R$ 10,00
  ✅ Saldo creditado com sucesso

✅ Processamento concluído
```

### 4. Monitorar Logs em Tempo Real

```bash
# Filtrar apenas logs do webhook PIX
tail -f logs/server.log | grep "Webhook PIX"

# Saída esperada quando webhook funciona
[Webhook PIX] Received notification
[Webhook PIX] Processing txid: abc123...
[Webhook PIX] Payment confirmed: R$ 10.00
[Webhook PIX] Successfully processed: abc123...
```

---

## 🎯 Checklist de Validação Final

Antes de considerar a integração completa, valide todos os pontos:

### Configuração

- [ ] Credenciais EfiPay configuradas e testadas
- [ ] Certificado válido e no caminho correto
- [ ] Domínio HTTPS acessível externamente
- [ ] Webhook configurado com `?ignorar=`

### Código

- [ ] Router do webhook registrado ANTES do `express.json()`
- [ ] Middleware `express.json()` adicionado ao router
- [ ] Validação de payload implementada
- [ ] Lógica de crédito completa (4 operações no banco)
- [ ] Campo `updatedAt` NÃO passado em recharges

### Testes

- [ ] Teste com curl retorna HTTP 200
- [ ] Pagamento real de R$ 0,01 processado automaticamente
- [ ] Saldo creditado corretamente
- [ ] Registro aparece em `/store/recharges`
- [ ] Logs mostram processamento correto

### Monitoramento

- [ ] Logs do servidor configurados
- [ ] Script de crédito manual disponível
- [ ] Script de verificação de webhook disponível
- [ ] Alerta de monitoramento configurado (opcional)

---

## 📞 Quando Pedir Ajuda

Se após seguir este checklist o problema persistir:

1. **Colete informações:**
   - Logs completos do servidor (últimas 50 linhas)
   - Resposta do script `check-webhook.ts`
   - Exemplo de payload recebido
   - Código do webhook handler

2. **Verifique documentação oficial:**
   - [EfiPay - Webhooks PIX](https://dev.efipay.com.br/docs/api-pix/webhooks)
   - [SDK Node.js](https://github.com/efipay/sdk-node-apis-efi)

3. **Entre em contato:**
   - Suporte EfiPay: suporte@sejaefi.com.br
   - Comunidade: [Discord EfiPay](https://discord.gg/efipay)

---

**Última atualização:** Dezembro 2024  
**Autor:** Manus AI
