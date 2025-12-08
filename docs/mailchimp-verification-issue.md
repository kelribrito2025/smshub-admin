# Problema de Verificação do Mailchimp Transactional

## 📋 Situação Atual

O domínio `numero-virtual.com` está configurado no Mailchimp Transactional (Mandrill), mas ainda não está verificado completamente, resultando em emails rejeitados com motivo "unsigned".

---

## ✅ O Que Já Foi Feito

### 1. Registros DNS Configurados e Propagados

Todos os registros DNS necessários foram adicionados no Cloudflare e estão propagados:

```bash
# DKIM 1
mte1._domainkey.numero-virtual.com → dkim1.mandrillapp.com (CNAME)

# DKIM 2
mte2._domainkey.numero-virtual.com → dkim2.mandrillapp.com (CNAME)

# Mandrill Verification
mandrill_verify.nhnkn_ltpa_bc024bdkoww.numero-virtual.com → "mandrill_verify.NhnKN_LtpA_bc024bdkOWw" (TXT)

# SPF
numero-virtual.com → v=spf1 ip4:172.106.0.111 +a ... (TXT)
```

### 2. Verificação DNS

```bash
$ dig TXT mandrill_verify.nhnkn_ltpa_bc024bdkoww.numero-virtual.com +short
"mandrill_verify.NhnKN_LtpA_bc024bdkOWw"

$ dig CNAME mte1._domainkey.numero-virtual.com +short
dkim1.mandrillapp.com.

$ dig CNAME mte2._domainkey.numero-virtual.com +short
dkim2.mandrillapp.com.
```

✅ **Todos os registros estão corretos e propagados!**

---

## ❌ Problema Atual

### Erro ao Enviar Email

```json
{
  "email": "xkelrix@gmail.com",
  "status": "rejected",
  "reject_reason": "unsigned"
}
```

### Status no Mailchimp Transactional

- ✅ **DKIM Settings:** DKIM valid (verde)
- ✅ **DMARC Status:** DMARC valid (verde)
- ❌ **Verified Domain:** Requires verification (vermelho)
- ❌ **Authentication Status:** Not authenticated (vermelho)

---

## 🔍 Causa Provável

O Mailchimp Transactional ainda não verificou o domínio, mesmo com todos os registros DNS corretos. Isso pode acontecer por:

1. **Cache do Mailchimp:** O sistema pode estar usando cache de DNS antigo
2. **Verificação Manual Necessária:** Precisa clicar em "Test DNS Settings" no painel
3. **Delay de Propagação:** Mailchimp pode levar até 24h para verificar automaticamente
4. **Verificação de Ownership:** Pode precisar enviar email de verificação

---

## ✅ Soluções Possíveis

### Solução 1: Testar DNS Settings no Mailchimp (RECOMENDADO)

1. Acessar: https://mandrillapp.com/settings/sending-domains
2. Localizar `numero-virtual.com`
3. Clicar no dropdown "Test DNS Settings"
4. Selecionar "Test DNS Settings"
5. Aguardar verificação (deve passar agora)

### Solução 2: Enviar Email de Verificação

1. No modal "Verify numero-virtual.com"
2. Inserir um email válido do domínio (ex: admin@numero-virtual.com)
3. Clicar em "Send verification email"
4. Acessar o email e clicar no link de verificação

**Problema:** Requer acesso a um email do domínio `numero-virtual.com`

### Solução 3: Aguardar Verificação Automática

O Mailchimp pode verificar automaticamente em até 24 horas. Mas isso não é ideal para testes imediatos.

### Solução 4: Contatar Suporte do Mailchimp

Se as soluções acima não funcionarem, pode ser necessário abrir ticket no suporte do Mailchimp.

---

## 🎯 Próximos Passos

1. **Usuário deve clicar em "Test DNS Settings"** no painel do Mailchimp
2. **Aguardar resultado** da verificação
3. **Se passar:** Testar envio de email novamente
4. **Se falhar:** Considerar soluções alternativas

---

## 📧 Teste de Envio de Email

Para testar após verificação:

```bash
cd /home/ubuntu/smshub-admin
node test-email-send.mjs xkelrix@gmail.com
```

**Resultado esperado após verificação:**
```json
{
  "email": "xkelrix@gmail.com",
  "status": "sent",  // ← Deve mudar de "rejected" para "sent"
  "_id": "..."
}
```

---

## 🔧 Alternativa: Usar Outro Serviço de Email

Se o Mailchimp continuar com problemas, podemos considerar:

1. **SendGrid** (12.000 emails/mês grátis)
2. **Amazon SES** (62.000 emails/mês grátis)
3. **Resend** (3.000 emails/mês grátis)
4. **Postmark** (100 emails/mês grátis)

Todos têm APIs simples e documentação clara.

---

## 📝 Notas Técnicas

### Por Que "unsigned"?

O erro "unsigned" significa que o Mailchimp não reconhece o domínio como verificado. Isso acontece porque:

1. O domínio precisa estar **explicitamente verificado** no painel
2. Não basta ter os registros DNS corretos
3. O Mailchimp precisa **confirmar** que você é o dono do domínio

### Diferença entre Mailchimp Marketing e Transactional

- **Mailchimp Marketing:** Para campanhas de email marketing
- **Mailchimp Transactional (Mandrill):** Para emails transacionais (verificação, senha, etc.)

São sistemas **separados** com painéis diferentes. Verificar o domínio em um não verifica no outro.

---

## 📚 Referências

- [Mailchimp Transactional - Sending Domains](https://mailchimp.com/developer/transactional/docs/authentication-delivery/#sending-domains)
- [Mailchimp - Verify Domain Ownership](https://mailchimp.com/help/verify-a-domain/)
- [Mandrill - Domain Verification](https://mandrill.zendesk.com/hc/en-us/articles/205582277-How-do-I-verify-my-domain-)
