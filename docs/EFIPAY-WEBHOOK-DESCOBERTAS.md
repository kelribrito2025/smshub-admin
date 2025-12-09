# 🔍 Descobertas Críticas da Documentação EfiPay

## 🚨 PROBLEMA IDENTIFICADO

Após ler a documentação oficial da EfiPay, descobri o problema:

### ⚠️ A EfiPay adiciona `/pix` automaticamente ao final da URL do webhook!

**Da documentação:**

> "Ao cadastrar seu webhook, enviaremos uma notificação de teste para a URL cadastrada, porém quando de fato uma notificação for enviada, o caminho `/pix` será acrescentado ao final da URL cadastrada."

---

## 🎯 O que está acontecendo:

### URL cadastrada no webhook:
```
https://app.numero-virtual.com/api/webhook/pix
```

### URL que a EfiPay REALMENTE chama:
```
https://app.numero-virtual.com/api/webhook/pix/pix  ❌
```

**Por isso o webhook nunca chega!** A EfiPay está chamando `/api/webhook/pix/pix`, que não existe no nosso servidor (404 Not Found).

---

## ✅ Solução 1: Adicionar parâmetro `?ignorar=`

**Da documentação:**

> "Para não precisar de duas rotas distintas, você pode adicionar um parâmetro `?ignorar=` ao final da URL cadastrada, para que o `/pix` não seja acrescentado na rota da sua URL."

### URL correta para cadastrar:
```
https://app.numero-virtual.com/api/webhook/pix?ignorar=
```

**Como funciona:**
- Teste de configuração: `https://app.numero-virtual.com/api/webhook/pix?ignorar=` ✅
- Notificação real: `https://app.numero-virtual.com/api/webhook/pix?ignorar=/pix` ✅

Ambas chegam na mesma rota `/api/webhook/pix` porque o Express ignora query params.

---

## ✅ Solução 2: Criar rota `/api/webhook` (sem `/pix`)

Cadastrar webhook como:
```
https://app.numero-virtual.com/api/webhook
```

**Como funciona:**
- Teste de configuração: `https://app.numero-virtual.com/api/webhook` ✅
- Notificação real: `https://app.numero-virtual.com/api/webhook/pix` ✅

Criar duas rotas no servidor:
```typescript
router.post("/webhook", handler);      // Teste de configuração
router.post("/webhook/pix", handler);  // Notificação real
```

---

## 🔧 Solução 3: Skip mTLS (Recomendado para servidores compartilhados)

**Da documentação:**

> "Para hospedagem em servidores compartilhados, pode haver restrições em relação à inserção de certificados gerados por outra entidade. Por isso, disponibilizamos a opção skip mTLS."

### Como ativar:

Adicionar header na requisição de configuração do webhook:
```
x-skip-mtls-checking: true
```

### Validações de segurança recomendadas:

1. **Verificar IP de origem:**
   - IP da EfiPay: `34.193.116.226`
   - Aceitar webhooks apenas deste IP

2. **Adicionar hash (HMAC) na URL:**
   ```
   https://app.numero-virtual.com/api/webhook/pix?hmac=xyz&ignorar=
   ```
   - Validar presença do HMAC em todas as notificações

---

## 📊 Logs da EfiPay (Análise)

Olhando os logs que você enviou:

### ✅ Sucesso (configuração do webhook):
```
PUT /v2/webhook/f2ba920b-7f59-496b-abf1-859b7b90e435
Status: ✅ Sucesso (23:16:32)
```

### ❌ Falha (configuração anterior):
```
PUT /v2/webhook/f2ba920b-7f59-496b-abf1-859b7b90e435
Status: ❌ Falha (22:40:07)
```

### ✅ Cobranças criadas:
```
POST /v2/cob
Status: ✅ Sucesso (23:12:16, 22:58:30, 22:56:36, 22:32:56)
```

**Conclusão dos logs:**
- Webhook foi configurado com sucesso às 23:16:32
- Cobranças foram criadas com sucesso
- **MAS as notificações de pagamento não estão chegando**

**Por quê?** Porque a EfiPay está chamando:
```
POST https://app.numero-virtual.com/api/webhook/pix/pix  ❌ 404
```

---

## 🎯 Próximos Passos

1. **Reconfigurar webhook com `?ignorar=`:**
   ```bash
   npx tsx scripts/setup-webhook.ts
   # Alterar URL para: https://app.numero-virtual.com/api/webhook/pix?ignorar=
   ```

2. **OU criar rota adicional `/api/webhook` (sem `/pix`)**

3. **Adicionar validação de IP da EfiPay (segurança)**

4. **Testar com pagamento PIX real**

5. **Creditar 13 transações pendentes manualmente**

---

## 📚 Referências

- [Documentação Oficial EfiPay - Webhooks](https://dev.efipay.com.br/docs/api-pix/webhooks/)
- [Vídeo: Configurando webhook EfiPay](https://www.youtube.com/watch?v=XB9bcZFTV3M)
- [Comunidade EfiPay - Webhooks PIX](https://comunidade.sejaefi.com.br/discussao/gerenciamento-webhooks-pix-estrutura-notificacoes-57)

---

## 🔐 Informações de Segurança

### mTLS (Mutual TLS)
- Requer certificado público da EfiPay no servidor
- Necessário para servidores dedicados
- Pode ser desabilitado com `x-skip-mtls-checking: true`

### Certificados da EfiPay:
- **Produção:** https://api.sejaefi.com.br/certificado-producao
- **Homologação:** https://api.sejaefi.com.br/certificado-homologacao

### IP da EfiPay:
```
34.193.116.226
```

### Validação recomendada (sem mTLS):
1. Verificar IP de origem
2. Adicionar HMAC na URL
3. Validar estrutura do payload
