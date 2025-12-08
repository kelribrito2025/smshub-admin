# Guia de Teste - Verificação de Email com Mailchimp

## 📋 Pré-requisitos

✅ **Verificações Concluídas:**
- [x] Credenciais Mailchimp configuradas
- [x] Servidor rodando na porta 3000
- [x] Email helper implementado
- [x] Endpoints tRPC criados
- [x] Página de verificação pronta

⏳ **Aguardando:**
- [ ] Verificar status do domínio `numero-virtual.com` no Mailchimp

---

## 🔍 Passo 1: Verificar Domínio no Mailchimp

1. Acesse: https://admin.mailchimp.com/account/domains/
2. Procure por `numero-virtual.com`
3. Verifique o status:
   - ✅ **Verde "Verified"** → Pode testar agora
   - ⚠️ **Amarelo "Pending"** → Aguardar 5-15 min
   - ❌ **Vermelho "Failed"** → Reconfigurar DNS

---

## 🧪 Passo 2: Criar Conta de Teste

### 2.1. Abrir Painel de Vendas

```
URL: https://3000-igsa1mz8pbdripx0uhf6y-bc43807a.manusvm.computer/
```

### 2.2. Preencher Formulário

1. Clicar em "Criar Conta"
2. Preencher:
   - **Nome:** Teste Mailchimp
   - **Email:** [SEU EMAIL REAL]
   - **Senha:** teste1234
3. Clicar em "Criar Conta"

### 2.3. Resultado Esperado

- ✅ Toast: "Conta criada! Verifique seu email"
- ✅ Redirecionamento para `/verify-email?customerId=X&email=Y`
- ✅ Página mostra campo de 6 dígitos

---

## 📧 Passo 3: Verificar Email Recebido

### 3.1. Abrir Caixa de Entrada

Verifique seu email (pode demorar 1-2 minutos).

### 3.2. Email Esperado

**Assunto:** Verifique seu email - Número Virtual

**Remetente:** NumeroVirtual <noreply@numero-virtual.com>

**Conteúdo:**
- Logo verde com "N"
- Código de 6 dígitos em destaque
- Aviso de expiração (15 minutos)

### 3.3. Se Não Receber

1. Verificar pasta de spam
2. Aguardar 2-3 minutos
3. Clicar em "Reenviar código"
4. Verificar logs do servidor

---

## ✅ Passo 4: Testar Verificação

### 4.1. Digitar Código

1. Copiar código do email
2. Colar na página de verificação
3. Clicar em "Verificar Email"

### 4.2. Resultado Esperado

- ✅ Toast: "Email verificado com sucesso!"
- ✅ Redirecionamento para login
- ✅ Pode fazer login normalmente

---

## 🧪 Testes Adicionais

### Teste 1: Código Incorreto

1. Digitar código errado (ex: 000000)
2. Resultado esperado: ❌ "Código inválido ou expirado"

### Teste 2: Código Expirado

1. Aguardar 15 minutos após receber email
2. Tentar usar código
3. Resultado esperado: ❌ "Código inválido ou expirado"

### Teste 3: Reenviar Código

1. Clicar em "Reenviar código"
2. Aguardar novo email
3. Código anterior deve ser invalidado
4. Novo código deve funcionar

---

## 📊 Monitoramento de Logs

### Ver Logs do Servidor

```bash
# Ver logs em tempo real
tail -f /home/ubuntu/smshub-admin/server.log

# Filtrar apenas emails
tail -f /home/ubuntu/smshub-admin/server.log | grep "email"
```

### Logs Esperados

```
[Email] Sending verification email to: teste@exemplo.com
[Email] Code generated: 123456
[Email] Mailchimp response: { status: 'sent', _id: '...' }
[Email] Email sent successfully
```

---

## 🐛 Troubleshooting

### Erro: "Domain not verified"

**Causa:** Domínio não verificado no Mailchimp

**Solução:**
1. Verificar DNS no Cloudflare
2. Aguardar propagação (5-15 min)
3. Clicar em "Verify" no Mailchimp

### Erro: "Invalid API key"

**Causa:** API key incorreta ou expirada

**Solução:**
1. Gerar nova API key no Mailchimp
2. Atualizar via `webdev_edit_secrets`

### Email Não Recebido

**Causas possíveis:**
1. Domínio não verificado
2. Email na pasta de spam
3. API key inválida
4. Erro no código do email helper

**Solução:**
1. Verificar logs do servidor
2. Verificar pasta de spam
3. Testar com outro email

---

## ✅ Checklist Final

- [ ] Domínio verificado no Mailchimp
- [ ] Conta de teste criada
- [ ] Email recebido
- [ ] Código validado com sucesso
- [ ] Login funcionando
- [ ] Código incorreto testado
- [ ] Reenvio de código testado

---

## 📝 Notas

- Códigos expiram em **15 minutos**
- Cada código pode ser usado apenas **1 vez**
- Reenviar código invalida o anterior
- Domínio deve estar verificado no Mailchimp
- Emails podem demorar 1-2 minutos para chegar
