# 🚀 Guia de Publicação e Configuração do Webhook PIX

## 📋 Pré-requisitos

✅ Sistema PIX EfiPay totalmente funcional em desenvolvimento  
✅ Endpoint webhook corrigido (aceita requisições de teste)  
✅ Pagamento teste processado com sucesso (R$ 1,00 creditado)  
✅ Script de processamento manual criado  

---

## 🎯 Passo 1: Publicar o Projeto

### 1.1 Acessar Interface de Publicação

1. Abra a interface do projeto no navegador
2. Clique no botão **"Publish"** no canto superior direito
3. Aguarde o deploy ser concluído

### 1.2 Verificar Publicação

Após publicação, o projeto estará disponível em:
```
https://painelsmsstore.manus.space
```

Teste acessando:
- Painel Admin: `https://painelsmsstore.manus.space/`
- Painel de Vendas: `https://painelsmsstore.manus.space/store`

---

## 🔗 Passo 2: Configurar Webhook na EfiPay

### 2.1 Executar Script de Configuração

Após publicação, execute o script de configuração do webhook:

```bash
cd /home/ubuntu/smshub-admin
pnpm tsx scripts/setup-webhook.ts
```

**Saída esperada:**
```
🔧 Configurando webhook PIX na EfiPay...

📡 URL do webhook: https://painelsmsstore.manus.space/api/webhook/pix
🔑 Chave PIX: f2ba920b-7f59-496b-abf1-859b7b90e435

✅ Webhook configurado com sucesso!

📋 Detalhes:
{
  "webhookUrl": "https://painelsmsstore.manus.space/api/webhook/pix",
  ...
}

🎉 Pronto! Agora você já pode testar recargas PIX!
```

### 2.2 Verificar Configuração

O webhook está configurado quando:
- ✅ Script executou sem erros
- ✅ EfiPay retornou status de sucesso
- ✅ URL do webhook foi aceita (retornou 200 OK no teste)

---

## 🧪 Passo 3: Testar Fluxo Completo

### 3.1 Fazer Recarga PIX

1. Acesse o painel de vendas: `https://painelsmsstore.manus.space/store`
2. Faça login com seu email
3. Clique em **"Recarregar"**
4. Selecione **PIX** como método de pagamento
5. Escolha um valor (ex: R$ 5,00)
6. Clique em **"Prosseguir"**
7. **Copie o código PIX** ou escaneie o QR Code
8. **Faça o pagamento** no app do seu banco

### 3.2 Aguardar Confirmação Automática

Após pagamento confirmado:
- ⏱️ **Aguarde até 10 segundos**
- 🔔 **Notificação aparecerá** no canto superior direito: "Recarga Aprovada! 💰"
- 💰 **Saldo será atualizado** automaticamente
- ✅ **Sem necessidade de recarregar a página**

### 3.3 Verificar Saldo

- Verifique que o saldo foi creditado corretamente
- Confira o card de saldo na sidebar (lado esquerdo)
- Valor deve aparecer atualizado imediatamente após notificação

---

## 🔧 Solução de Problemas

### ❌ Webhook não configurou (erro 400)

**Causa:** Versão antiga do código ainda em produção

**Solução:**
1. Certifique-se de que publicou o projeto ANTES de configurar webhook
2. Aguarde 1-2 minutos após publicação
3. Execute o script novamente

### ❌ Pagamento não creditou automaticamente

**Opção 1: Processar Manualmente**
```bash
cd /home/ubuntu/smshub-admin
pnpm tsx process-pix-payment.ts
```

**Opção 2: Verificar Logs do Webhook**
```bash
# Verificar se webhook foi chamado
tail -100 /var/log/app.log | grep "PIX Webhook"
```

### ❌ Notificação não apareceu

**Causa:** Conexão SSE não estabelecida

**Solução:**
1. Recarregue a página do painel de vendas (F5)
2. Verifique se aparece "Conectado" no canto superior direito
3. Se não aparecer, verifique console do navegador (F12)

---

## 📊 Monitoramento

### Verificar Transações PIX

```sql
-- Ver todas as transações PIX
SELECT id, txid, customerId, amount, status, createdAt, paidAt 
FROM pix_transactions 
ORDER BY createdAt DESC 
LIMIT 10;

-- Ver transações pendentes
SELECT * FROM pix_transactions WHERE status = 'pending';

-- Ver transações pagas
SELECT * FROM pix_transactions WHERE status = 'paid';
```

### Verificar Saldo dos Clientes

```sql
-- Ver saldo de um cliente específico
SELECT id, name, email, balance 
FROM customers 
WHERE id = 90007;

-- Ver histórico de transações de saldo
SELECT * FROM balance_transactions 
WHERE customerId = 90007 
ORDER BY createdAt DESC;
```

---

## 🎉 Sistema Completo Funcionando

Após seguir todos os passos, você terá:

✅ **Painel de Vendas Publicado** em produção  
✅ **Sistema PIX Totalmente Automático**  
✅ **Webhook Configurado** e recebendo notificações  
✅ **Notificações em Tempo Real** via SSE  
✅ **Saldo Creditado Automaticamente** após pagamento  
✅ **Histórico de Transações** registrado no banco  

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique logs do servidor** para erros
2. **Execute script de processamento manual** como fallback
3. **Consulte documentação da EfiPay** para detalhes da API
4. **Entre em contato** com suporte técnico se necessário

---

**Última atualização:** 02/12/2025  
**Versão do sistema:** 9c17cd73
