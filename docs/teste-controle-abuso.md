# Guia de Teste - Controle de Abuso (Limite de Pedidos Simultâneos)

## 📋 Objetivo
Validar que o sistema bloqueia corretamente usuários que tentam criar mais pedidos simultâneos do que o limite configurado por API.

---

## 🔧 Pré-requisitos
1. Sistema rodando (`pnpm dev`)
2. Acesso ao painel admin (`/apis`)
3. Acesso ao painel de vendas (`/store`)
4. Cliente de teste com saldo suficiente

---

## 🧪 Fluxo de Teste Completo

### **Etapa 1: Configurar Limite na API**

1. Acesse o painel admin: `/apis`
2. Clique em **"Editar"** em qualquer API (ex: Opção 1 - SMS24H)
3. Localize o campo **"Limite de Pedidos Simultâneos"**
4. Configure o valor: **3** (três pedidos simultâneos)
5. Clique em **"Salvar Alterações"**

**✅ Resultado esperado:**
- API atualizada com `maxSimultaneousOrders = 3`
- Mensagem de sucesso exibida

---

### **Etapa 2: Criar Pedidos Até o Limite**

1. Acesse o painel de vendas: `/store/catalog`
2. Faça login com um cliente de teste
3. Escolha um serviço (ex: WhatsApp) e país (ex: Brasil)
4. Clique em **"Comprar"** → **1º pedido criado** ✅
5. Repita o processo → **2º pedido criado** ✅
6. Repita novamente → **3º pedido criado** ✅

**✅ Resultado esperado:**
- 3 pedidos criados com sucesso
- Saldo debitado corretamente
- Pedidos aparecem em `/store/activations` com status `active`

**🔍 Verificação no Console (Backend):**
```
[ABUSE CONTROL] Customer X has 1/3 active orders on API SMS24H
[ABUSE CONTROL] Customer X has 2/3 active orders on API SMS24H
[ABUSE CONTROL] Customer X has 3/3 active orders on API SMS24H
```

---

### **Etapa 3: Tentar Exceder o Limite (Deve Bloquear)**

1. Ainda em `/store/catalog`
2. Tente criar o **4º pedido** (mesmo serviço/país)
3. Clique em **"Comprar"**

**✅ Resultado esperado:**
- ❌ **Pedido bloqueado!**
- Mensagem de erro exibida:
  > "Limite de pedidos simultâneos atingido para SMS24H. Você tem 3 pedidos ativos e o limite é 3. Aguarde a conclusão ou cancelamento de pedidos existentes."
- Saldo **NÃO** foi debitado
- Pedido **NÃO** foi criado

**🔍 Verificação no Console (Backend):**
```
[ABUSE CONTROL] Customer X exceeded simultaneous orders limit for API SMS24H (3/3)
```

---

### **Etapa 4: Cancelar Pedido (Liberar Vaga)**

1. Acesse `/store/activations`
2. Localize um dos 3 pedidos ativos
3. Clique em **"Cancelar"** em um dos pedidos
4. Confirme o cancelamento

**✅ Resultado esperado:**
- Pedido cancelado com sucesso
- Status mudou de `active` → `cancelled`
- Saldo reembolsado (se aplicável)
- Agora você tem **2/3 pedidos ativos**

---

### **Etapa 5: Criar Novo Pedido (Deve Funcionar)**

1. Volte para `/store/catalog`
2. Tente criar um **novo pedido** (mesmo serviço/país)
3. Clique em **"Comprar"**

**✅ Resultado esperado:**
- ✅ **Pedido criado com sucesso!**
- Saldo debitado corretamente
- Agora você tem **3/3 pedidos ativos** novamente

**🔍 Verificação no Console (Backend):**
```
[ABUSE CONTROL] Customer X has 2/3 active orders on API SMS24H
[ABUSE CONTROL] Customer X has 3/3 active orders on API SMS24H
```

---

## 🎯 Casos de Teste Adicionais

### **Teste 1: Limite 0 = Ilimitado**
1. Configure `maxSimultaneousOrders = 0` na API
2. Tente criar 10 pedidos simultâneos
3. **Resultado:** Todos devem ser criados sem bloqueio

### **Teste 2: Pedidos em APIs Diferentes**
1. Configure limite 3 na API 1 (SMS24H)
2. Configure limite 5 na API 2 (SMSHub)
3. Crie 3 pedidos na API 1 → OK
4. Crie 5 pedidos na API 2 → OK
5. Tente criar 4º pedido na API 1 → **Bloqueado**
6. Tente criar 6º pedido na API 2 → **Bloqueado**

### **Teste 3: Pedidos Concluídos Não Contam**
1. Configure limite 3
2. Crie 3 pedidos ativos → OK
3. Aguarde 1 pedido ser concluído (status `completed`)
4. Tente criar novo pedido → **Deve funcionar** (agora tem 2 ativos + 1 concluído)

### **Teste 4: Múltiplos Clientes**
1. Configure limite 3
2. Cliente A cria 3 pedidos → OK
3. Cliente B cria 3 pedidos → OK
4. Cliente A tenta 4º pedido → **Bloqueado**
5. Cliente B tenta 4º pedido → **Bloqueado**
6. **Validação:** Limites são isolados por cliente

---

## 📊 Verificação no Banco de Dados

### **Query para contar pedidos ativos:**
```sql
SELECT 
  c.id AS customer_id,
  c.name AS customer_name,
  a.apiId AS api_id,
  COUNT(*) AS active_orders
FROM activations a
JOIN customers c ON a.userId = c.id
WHERE a.status IN ('pending', 'active')
GROUP BY c.id, a.apiId
ORDER BY active_orders DESC;
```

### **Query para verificar limite configurado:**
```sql
SELECT 
  id,
  name,
  maxSimultaneousOrders AS limite,
  active
FROM sms_apis
ORDER BY priority;
```

---

## 🐛 Troubleshooting

### **Problema:** Pedido não foi bloqueado mesmo com limite atingido
**Solução:**
1. Verifique se `maxSimultaneousOrders > 0` na tabela `sms_apis`
2. Verifique se o pedido está usando a API correta (`apiId`)
3. Verifique logs do backend (`[ABUSE CONTROL]`)

### **Problema:** Pedido bloqueado mesmo com vagas disponíveis
**Solução:**
1. Verifique se há pedidos "travados" com status `pending` ou `active` antigos
2. Execute query SQL para contar pedidos ativos manualmente
3. Cancele pedidos antigos se necessário

### **Problema:** Limite não aparece no modal de edição
**Solução:**
1. Limpe cache do navegador (Ctrl+Shift+R)
2. Verifique se coluna `max_simultaneous_orders` existe no banco
3. Reinicie o servidor (`pnpm dev`)

---

## ✅ Checklist Final

- [ ] Limite configurado corretamente na API
- [ ] Pedidos criados até o limite (sem bloqueio)
- [ ] 4º pedido bloqueado com mensagem clara
- [ ] Cancelamento libera vaga para novo pedido
- [ ] Logs `[ABUSE CONTROL]` aparecem no console
- [ ] Limite 0 funciona como ilimitado
- [ ] Limites isolados por API
- [ ] Limites isolados por cliente
- [ ] Pedidos concluídos não contam no limite

---

## 📝 Notas Técnicas

**Status considerados "ativos":**
- `pending` (aguardando número)
- `active` (número recebido, aguardando SMS)

**Status que liberam vaga:**
- `completed` (SMS recebido)
- `cancelled` (cancelado pelo usuário)
- `failed` (falha na API)
- `expired` (expirou sem receber SMS)

**Proteções implementadas:**
- ✅ Lock transacional (`operationLockManager`)
- ✅ Validação antes de chamar API externa
- ✅ Logging completo para auditoria
- ✅ Mensagem de erro clara para o usuário
- ✅ Desbloqueio automático ao cancelar/concluir
