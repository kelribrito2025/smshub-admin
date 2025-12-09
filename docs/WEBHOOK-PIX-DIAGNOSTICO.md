# 🔧 Diagnóstico Completo: Webhook PIX Não Funcionando

## 📊 Status Atual

### ✅ O que está funcionando:
- QR Code gerado corretamente
- Pagamentos realizados com sucesso na EfiPay
- Endpoint `/api/webhook/pix` acessível externamente (HTTP 200)
- Cloudflare **NÃO está bloqueando** o webhook
- Webhook configurado na EfiPay: `https://app.numero-virtual.com/api/webhook/pix`

### ❌ O que NÃO está funcionando:
- Webhook nunca chega no servidor (nenhum log)
- 13 transações PIX pendentes no banco (não creditadas)
- Clientes pagam mas saldo não é creditado automaticamente

---

## 🔍 Transações Pendentes

Total: **13 transações** (R$ 56,55 não creditados)

| ID | Cliente | Valor | Data | TxID |
|----|---------|-------|------|------|
| 5 | 90007 | R$ 2,00 | 02/12/2025 14:56 | 98c214f4... |
| 30003 | 90007 | R$ 20,00 | 02/12/2025 16:44 | 0d265591... |
| 30004 | 90007 | R$ 20,00 | 02/12/2025 17:08 | 9b7114d8... |
| 330001 | 330001 | R$ 2,00 | 05/12/2025 21:37 | 612700ac... |
| 330002 | 330001 | R$ 1,22 | 05/12/2025 21:39 | a0b9c539... |
| 510015 | 480001 | R$ 1,09 | 08/12/2025 19:04 | 54334eb5... |
| 510016 | 480001 | R$ 1,12 | 08/12/2025 19:06 | abc4c01f... |
| 510017 | 480001 | R$ 2,33 | 08/12/2025 19:35 | d2d97b13... |
| 510019 | 180002 | R$ 2,00 | 08/12/2025 19:56 | 2ef4d4a3... |
| 510020 | 480001 | R$ 1,02 | 08/12/2025 20:32 | 498216c5... |
| 510021 | 480001 | R$ 1,55 | 08/12/2025 20:56 | 3e7b6437... |
| 510022 | 480001 | R$ 1,22 | 08/12/2025 20:58 | ef99d987... |
| 510023 | 480001 | R$ 1,00 | 08/12/2025 21:12 | ca94aa8c... |

---

## 🎯 Possíveis Causas

### 1️⃣ EfiPay não está enviando webhooks

**Sintomas:**
- Webhook configurado mas nunca recebido
- Nenhum log no servidor
- Teste manual funciona, mas EfiPay não envia

**Causas possíveis:**
- Conta EfiPay em modo sandbox (webhooks não funcionam em sandbox)
- Webhook não ativado na conta EfiPay
- Chave PIX sem permissão para webhooks
- Certificado SSL não aceito pela EfiPay

**Como validar:**
1. Verificar se conta está em **produção** (não sandbox)
2. Verificar logs da EfiPay (painel administrativo)
3. Testar com ferramenta de webhook (webhook.site)

---

### 2️⃣ Webhook configurado mas EfiPay não consegue validar

**Sintomas:**
- Webhook configurado com sucesso
- EfiPay tenta enviar mas falha silenciosamente
- Nenhum log no servidor

**Causas possíveis:**
- Certificado SSL inválido ou expirado
- TLS version incompatível
- Headers obrigatórios faltando
- Timeout na resposta

**Como validar:**
1. Testar SSL: `https://www.ssllabs.com/ssltest/analyze.html?d=app.numero-virtual.com`
2. Verificar certificado: `openssl s_client -connect app.numero-virtual.com:443`
3. Testar com curl detalhado: `curl -v https://app.numero-virtual.com/api/webhook/pix`

---

### 3️⃣ Webhooks sendo enviados mas não processados

**Sintomas:**
- EfiPay envia webhook
- Servidor recebe mas não processa
- Erro silencioso no código

**Causas possíveis:**
- Body parser não configurado corretamente
- Erro no código de processamento
- Exceção não tratada
- Logs não sendo exibidos

**Como validar:**
1. Adicionar logs detalhados em TODOS os pontos do webhook
2. Testar manualmente com payload real da EfiPay
3. Verificar logs do servidor em tempo real

---

## ✅ Soluções

### Solução 1: Validar Conta EfiPay

**Passo 1:** Verificar se conta está em produção

```bash
# Verificar variável de ambiente
echo $EFIPAY_ENVIRONMENT
# Deve retornar: production
```

**Passo 2:** Verificar logs da EfiPay
1. Acessar painel administrativo da EfiPay
2. Ir em **Webhooks** ou **Notificações**
3. Verificar se há tentativas de envio
4. Verificar se há erros registrados

**Passo 3:** Testar com webhook.site
1. Acessar https://webhook.site
2. Copiar URL única gerada
3. Configurar webhook na EfiPay com essa URL
4. Fazer pagamento PIX de teste
5. Verificar se webhook chega no webhook.site

---

### Solução 2: Adicionar Logs Detalhados

**Atualizar código do webhook para logar TUDO:**

```typescript
// server/webhook-pix.ts

// Log de TODAS as requisições (antes do body parser)
app.use('/api/webhook/pix', (req, res, next) => {
  console.log('\n' + '='.repeat(80));
  console.log('[WEBHOOK] Requisição recebida');
  console.log('='.repeat(80));
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('IP:', req.ip || req.connection.remoteAddress);
  console.log('='.repeat(80) + '\n');
  next();
});

// Log do body (depois do body parser)
router.post('/webhook/pix', async (req, res) => {
  console.log('[WEBHOOK] Body recebido:', JSON.stringify(req.body, null, 2));
  
  try {
    // ... resto do código
  } catch (error) {
    console.error('[WEBHOOK] ERRO:', error);
    // Sempre retornar 200 para EfiPay não retentar
    res.status(200).json({ success: false, error: error.message });
  }
});
```

---

### Solução 3: Creditar Transações Pendentes Manualmente

**Script para creditar todas as 13 transações:**

```bash
cd /home/ubuntu/smshub-admin
npx tsx scripts/credit-pending-pix.ts
```

**O script irá:**
1. Buscar todas as transações PIX pendentes
2. Para cada transação:
   - Creditar saldo do cliente
   - Criar registro em `recharges`
   - Criar registro em `balance_transactions`
   - Atualizar status para `completed`
   - Processar bônus de primeira recarga (se aplicável)
3. Exibir resumo final

---

### Solução 4: Testar Webhook com Payload Real

**Criar script de teste com payload real da EfiPay:**

```bash
# Testar webhook localmente
curl -X POST http://localhost:3000/api/webhook/pix \
  -H "Content-Type: application/json" \
  -d '{
    "pix": [{
      "endToEndId": "E12345678202112311234567890AB1D1",
      "txid": "7978c0c97ea847e78e8849634473c1f1",
      "valor": "5.00",
      "horario": "2021-12-31T23:59:59.000Z",
      "infoPagador": "Pagamento teste"
    }]
  }'

# Testar webhook em produção
curl -X POST https://app.numero-virtual.com/api/webhook/pix \
  -H "Content-Type: application/json" \
  -d '{
    "pix": [{
      "endToEndId": "E12345678202112311234567890AB1D1",
      "txid": "7978c0c97ea847e78e8849634473c1f1",
      "valor": "5.00",
      "horario": "2021-12-31T23:59:59.000Z",
      "infoPagador": "Pagamento teste"
    }]
  }'
```

---

## 🔧 Configuração da Cloudflare (Prevenção)

Embora o teste tenha funcionado, é recomendado configurar exceções na Cloudflare para garantir que webhooks nunca sejam bloqueados.

### 1️⃣ Desativar Bot Fight Mode

1. Acesse dashboard da Cloudflare
2. Selecione domínio `app.numero-virtual.com`
3. Vá em **Security** → **Bots**
4. **Desative** Bot Fight Mode OU crie exceção para `/api/webhook/pix`

### 2️⃣ Criar WAF Rule Exception

1. Acesse **Security** → **WAF**
2. Clique em **Create rule**
3. Configure:
   - **Nome:** `PIX Webhook Bypass`
   - **Field:** `URI Path`
   - **Operator:** `contains`
   - **Value:** `/api/webhook/pix`
   - **Action:** `Skip` (todas as opções)
4. Clique em **Deploy**

### 3️⃣ Criar Page Rule

1. Acesse **Rules** → **Page Rules**
2. Clique em **Create Page Rule**
3. Configure:
   - **URL:** `app.numero-virtual.com/api/webhook/pix*`
   - **Settings:**
     - Security Level: `Essentially Off`
     - Cache Level: `Bypass`
4. Salve

---

## 📋 Checklist de Diagnóstico

- [ ] 1. Verificar variável `EFIPAY_ENVIRONMENT` (deve ser `production`)
- [ ] 2. Verificar logs da EfiPay (painel administrativo)
- [ ] 3. Testar com webhook.site para validar se EfiPay envia webhooks
- [ ] 4. Verificar certificado SSL: https://www.ssllabs.com/ssltest/
- [ ] 5. Adicionar logs detalhados no código do webhook
- [ ] 6. Testar webhook com payload real (curl)
- [ ] 7. Monitorar logs do servidor em tempo real durante pagamento
- [ ] 8. Creditar transações pendentes manualmente (13 transações)
- [ ] 9. Configurar exceções na Cloudflare (prevenção)
- [ ] 10. Fazer pagamento PIX de teste e validar funcionamento

---

## 🎯 Próximos Passos

1. **Imediato:** Creditar as 13 transações pendentes manualmente
2. **Curto prazo:** Adicionar logs detalhados e testar webhook
3. **Médio prazo:** Validar conta EfiPay e configuração de webhooks
4. **Longo prazo:** Implementar monitoramento e alertas para webhooks

---

## 📞 Suporte

Se após todas as validações o webhook ainda não funcionar:

1. **Contatar suporte da EfiPay:**
   - Validar se webhooks estão ativos na conta
   - Verificar logs de tentativas de envio
   - Solicitar teste manual de webhook

2. **Verificar documentação oficial:**
   - https://dev.efipay.com.br/docs/api-pix/webhooks
   - https://dev.efipay.com.br/docs/api-pix/notificacoes

3. **Considerar alternativas:**
   - Polling periódico (verificar transações a cada X minutos)
   - Webhook alternativo (Ngrok para debug)
   - Notificação manual (admin credita manualmente)
