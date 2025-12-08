# Guia de Teste - Recarga PIX

## 📋 Pré-requisitos

✅ **Verificações Concluídas:**
- [x] Webhook configurado na EfiPay
- [x] URL atualizada para https://app.numero-virtual.com/api/webhook/pix
- [x] Servidor rodando
- [x] Sistema de crédito automático implementado

---

## 🧪 Passo a Passo do Teste

### **Passo 1: Acessar Painel de Vendas**

```
URL: https://app.numero-virtual.com
```

1. Fazer login com conta existente
2. Verificar saldo atual (anotar valor)

---

### **Passo 2: Criar Recarga PIX**

1. Clicar no botão **"Recarregar"** (verde, na sidebar)
2. Digitar valor: **R$ 2,00** (valor mínimo para teste)
3. Clicar em **"Gerar QR Code PIX"**
4. Aguardar geração do QR Code (2-3 segundos)

**Resultado esperado:**
- ✅ Modal com QR Code aparece
- ✅ Código PIX Copia e Cola disponível
- ✅ Timer de expiração (15 minutos)

---

### **Passo 3: Realizar Pagamento**

**Opção A: Escanear QR Code**
1. Abrir app do banco no celular
2. Ir em PIX → Pagar com QR Code
3. Escanear QR Code da tela
4. Confirmar pagamento de R$ 2,00

**Opção B: Copiar e Colar**
1. Clicar em "Copiar código PIX"
2. Abrir app do banco
3. Ir em PIX → Pix Copia e Cola
4. Colar código
5. Confirmar pagamento de R$ 2,00

---

### **Passo 4: Aguardar Crédito Automático**

**Tempo esperado:** 5-10 segundos após pagamento

**O que deve acontecer:**
1. ✅ EfiPay detecta pagamento
2. ✅ EfiPay chama webhook: `https://app.numero-virtual.com/api/webhook/pix`
3. ✅ Servidor recebe webhook
4. ✅ Sistema valida transação
5. ✅ Saldo é creditado automaticamente
6. ✅ Registro criado em `recharges`
7. ✅ Registro atualizado em `pix_transactions`

**Validação visual:**
- ✅ Saldo atualiza automaticamente na tela
- ✅ Toast de sucesso: "Recarga confirmada!"
- ✅ Modal de PIX fecha automaticamente

---

## 📊 Monitoramento de Logs

### Ver Logs do Webhook

Os logs do servidor mostrarão:

```
[Webhook PIX] Received webhook for txid: E18236120202409091221s001
[Webhook PIX] Payment confirmed: R$ 2.00
[Webhook PIX] Customer ID: 180002
[Webhook PIX] Current balance: R$ 0.00
[Webhook PIX] New balance: R$ 2.00
[Webhook PIX] Recharge created: ID 123
[Webhook PIX] Transaction updated: status=confirmed
```

---

## ✅ Validações Pós-Teste

### 1. Verificar Saldo

- Saldo anterior: R$ X,XX
- Valor recargado: R$ 2,00
- Saldo novo: R$ (X,XX + 2,00)

### 2. Verificar Histórico de Recargas

1. Ir em **"Histórico"** no menu
2. Verificar nova recarga na lista
3. Dados esperados:
   - Valor: R$ 2,00
   - Método: PIX
   - Status: Confirmado
   - Data/Hora: Agora

### 3. Verificar Banco de Dados (Opcional)

```sql
-- Ver última recarga
SELECT * FROM recharges ORDER BY createdAt DESC LIMIT 1;

-- Ver transação PIX
SELECT * FROM pix_transactions WHERE status = 'confirmed' ORDER BY createdAt DESC LIMIT 1;
```

---

## 🐛 Troubleshooting

### Problema: Saldo Não Creditou

**Causas possíveis:**
1. Webhook não foi chamado pela EfiPay
2. Erro no processamento do webhook
3. Transação PIX ainda pendente

**Solução:**
1. Verificar logs do servidor
2. Verificar status da transação no banco
3. Verificar se pagamento foi confirmado no app do banco

### Problema: QR Code Não Gerou

**Causas possíveis:**
1. Credenciais EfiPay inválidas
2. Erro de conexão com API
3. Valor abaixo do mínimo

**Solução:**
1. Verificar logs do servidor
2. Verificar credenciais EfiPay
3. Tentar valor maior (R$ 5,00)

### Problema: Webhook Não Chegou

**Causas possíveis:**
1. URL do webhook incorreta
2. Servidor não acessível publicamente
3. Firewall bloqueando requisições

**Solução:**
1. Verificar URL configurada na EfiPay
2. Testar webhook manualmente com curl
3. Verificar se domínio está publicado

---

## 🧪 Teste Manual do Webhook

Para testar o webhook sem fazer pagamento real:

```bash
curl -X POST https://app.numero-virtual.com/api/webhook/pix \
  -H "Content-Type: application/json" \
  -d '{
    "pix": [{
      "endToEndId": "E18236120202409091221s001",
      "txid": "TEST123456",
      "valor": "2.00",
      "horario": "2024-12-08T13:00:00Z",
      "infoPagador": "Teste Manual"
    }]
  }'
```

**Resultado esperado:**
- HTTP 200 OK
- Saldo creditado
- Logs no servidor

---

## 📝 Checklist de Teste

- [ ] Login no painel realizado
- [ ] Saldo inicial anotado
- [ ] Recarga PIX criada (R$ 2,00)
- [ ] QR Code gerado com sucesso
- [ ] Pagamento realizado via app do banco
- [ ] Webhook recebido (verificar logs)
- [ ] Saldo creditado automaticamente
- [ ] Saldo final validado (inicial + R$ 2,00)
- [ ] Recarga aparece no histórico
- [ ] Registro criado em `recharges`
- [ ] Transação atualizada em `pix_transactions`

---

## 🎉 Teste Bem-Sucedido!

Se todos os passos acima funcionaram, o sistema de recargas PIX está **100% operacional**!

**Próximos testes:**
- Testar valores diferentes (R$ 5, R$ 10, R$ 50)
- Testar múltiplas recargas simultâneas
- Testar expiração de QR Code (15 minutos)
- Testar cancelamento de recarga
