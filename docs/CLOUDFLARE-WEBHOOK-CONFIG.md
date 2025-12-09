# 🔧 Guia de Configuração da Cloudflare para Webhook PIX

## 🚨 Problema Identificado

O webhook PIX não está chegando no servidor mesmo após todas as correções de código. A causa mais provável é o **bloqueio pela Cloudflare** antes do Node.js processar a requisição.

## 📋 Sintomas

- ✅ QR Code gerado corretamente
- ✅ Pagamento realizado com sucesso na EfiPay
- ❌ Webhook nunca chega no servidor (nenhum log)
- ❌ EfiPay não consegue validar URL do webhook
- ❌ Nenhuma transação creditada automaticamente

## 🔍 Causas Possíveis (Cloudflare)

1. **Bot Fight Mode** bloqueando webhooks de terceiros
2. **WAF Rules** bloqueando POST sem cookies
3. **Challenge/Captcha** exigido (EfiPay não consegue responder)
4. **Proxy Orange Cloud** alterando headers/body
5. **Rate Limiting** agressivo
6. **Payload JSON** sendo modificado/bloqueado

---

## ✅ Soluções Passo a Passo

### 1️⃣ Desativar Bot Fight Mode

**Por que:** Bot Fight Mode bloqueia 100% dos webhooks de terceiros (como EfiPay) porque eles não têm cookies nem JavaScript.

**Como fazer:**
1. Acesse o dashboard da Cloudflare
2. Selecione o domínio `app.numero-virtual.com`
3. Vá em **Security** → **Bots**
4. Encontre **Bot Fight Mode**
5. Clique em **Configure**
6. **Desative** Bot Fight Mode OU crie exceção para `/api/webhook/pix`

---

### 2️⃣ Criar WAF Rule Exception (Bypass)

**Por que:** WAF Rules podem bloquear requisições POST sem cookies ou de IPs desconhecidos.

**Como fazer:**
1. Acesse **Security** → **WAF**
2. Clique em **Create rule**
3. Configure a regra:
   - **Nome:** `PIX Webhook Bypass`
   - **Field:** `URI Path`
   - **Operator:** `contains`
   - **Value:** `/api/webhook/pix`
   - **Action:** `Skip` → Selecione todas as opções (WAF, Rate Limiting, etc)
4. Clique em **Deploy**

**Regra alternativa (mais específica):**
```
(http.request.uri.path contains "/api/webhook/pix" and http.request.method eq "POST")
```

---

### 3️⃣ Criar Page Rule para Bypass

**Por que:** Page Rules permitem desativar cache, segurança e otimizações para rotas específicas.

**Como fazer:**
1. Acesse **Rules** → **Page Rules**
2. Clique em **Create Page Rule**
3. Configure:
   - **URL:** `app.numero-virtual.com/api/webhook/pix*`
   - **Settings:**
     - Security Level: `Essentially Off`
     - Cache Level: `Bypass`
     - Disable Performance
     - Disable Apps
4. Clique em **Save and Deploy**

---

### 4️⃣ Verificar Modo do Proxy (Orange vs Gray Cloud)

**Por que:** Proxy Orange Cloud (proxied) pode alterar headers, body e encoding, quebrando webhooks.

**Como fazer:**
1. Acesse **DNS** → **Records**
2. Encontre o registro `app.numero-virtual.com`
3. Verifique o ícone da nuvem:
   - 🟠 **Orange Cloud (Proxied):** Cloudflare está interceptando tráfego
   - ⚪ **Gray Cloud (DNS Only):** Cloudflare apenas resolve DNS (recomendado para webhooks)

**Opção 1 (Recomendada):** Criar subdomínio específico para webhooks
- Criar `webhooks.numero-virtual.com` com **Gray Cloud (DNS Only)**
- Atualizar webhook na EfiPay para `https://webhooks.numero-virtual.com/api/webhook/pix`

**Opção 2:** Manter Orange Cloud + configurar exceções (passos 1-3 acima)

---

### 5️⃣ Desativar Rocket Loader e Auto Minify

**Por que:** Essas otimizações podem modificar payloads JSON.

**Como fazer:**
1. Acesse **Speed** → **Optimization**
2. Desative:
   - **Rocket Loader**
   - **Auto Minify** (HTML, CSS, JS)
3. Salve as alterações

---

### 6️⃣ Verificar Rate Limiting

**Por que:** Rate limiting pode bloquear webhooks se houver muitas requisições.

**Como fazer:**
1. Acesse **Security** → **WAF** → **Rate limiting rules**
2. Verifique se há regras ativas
3. Se houver, crie exceção para `/api/webhook/pix`

---

## 🧪 Teste de Validação

Após aplicar as configurações acima, teste o webhook externamente:

```bash
curl -X POST https://app.numero-virtual.com/api/webhook/pix \
  -H "Content-Type: application/json" \
  -d '{"test":true}' -v
```

**Resultado esperado:**
- ✅ Status 200 OK
- ✅ Resposta: `{"success":true,"message":"Webhook received (empty payload)"}`
- ✅ Logs no servidor mostrando requisição recebida

**Se retornar 403, 409, 522 ou 5xx:**
- ❌ Cloudflare ainda está bloqueando
- Revise os passos acima
- Verifique logs da Cloudflare (Security Events)

---

## 📊 Monitoramento

### Logs da Cloudflare
1. Acesse **Security** → **Events**
2. Filtre por `/api/webhook/pix`
3. Verifique se há bloqueios (Challenge, Block, JS Challenge)

### Logs do Servidor
```bash
# Acessar logs do servidor
pm2 logs

# Filtrar apenas webhooks PIX
pm2 logs | grep "PIX Webhook"
```

---

## 🎯 Checklist Final

- [ ] Bot Fight Mode desativado ou com exceção para webhook
- [ ] WAF Rule Exception criada para `/api/webhook/pix`
- [ ] Page Rule criada para bypass de segurança/cache
- [ ] Proxy verificado (considerar Gray Cloud ou subdomínio)
- [ ] Rocket Loader e Auto Minify desativados
- [ ] Rate Limiting verificado e exceção criada se necessário
- [ ] Teste com curl retornando 200 OK
- [ ] Logs do servidor mostrando requisições recebidas
- [ ] Webhook reconfigurado na EfiPay (se mudou URL)
- [ ] Teste real de pagamento PIX validado

---

## 📞 Suporte

Se após aplicar todas as configurações o webhook ainda não funcionar:

1. **Verifique Security Events na Cloudflare** para identificar bloqueios específicos
2. **Capture logs completos** do servidor durante tentativa de webhook
3. **Teste com subdomínio DNS-only** (sem proxy da Cloudflare)
4. **Entre em contato com suporte da EfiPay** para validar que eles estão enviando webhooks

---

## 🔗 Referências

- [Cloudflare WAF Rules](https://developers.cloudflare.com/waf/)
- [Cloudflare Page Rules](https://developers.cloudflare.com/rules/page-rules/)
- [Cloudflare Bot Management](https://developers.cloudflare.com/bots/)
- [EfiPay Webhooks](https://dev.efipay.com.br/docs/api-pix/webhooks)
