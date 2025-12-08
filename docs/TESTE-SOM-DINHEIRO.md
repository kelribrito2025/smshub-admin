# 🔊 Teste Manual - Som de Dinheiro Recebido

## Objetivo
Verificar se o som de "dinheiro recebido" toca quando admin adiciona saldo ao cliente.

## Preparação

### 1. Abrir Duas Abas do Navegador

**Aba 1 - Painel Admin:**
- URL: `http://localhost:3000/admin/customers`
- Login: admin@admin.com / 290819943@KeL29081994337590064

**Aba 2 - Painel de Vendas:**
- URL: `http://localhost:3000/`
- Login: Cliente qualquer (ex: xkelrix@gmail.com)
- **IMPORTANTE:** Cliente deve estar logado para receber notificações SSE

### 2. Verificar Conexão SSE (Aba 2)

1. Abra o Console do navegador (F12 → Console)
2. Verifique se aparecem os logs:
   ```
   [Notifications] Connecting to SSE for customer 180002
   [Notifications] SSE connection opened
   ```
3. Se não aparecer, o cliente não está conectado ao SSE!

## Teste

### 3. Adicionar Saldo (Aba 1 - Admin)

1. Vá em "Clientes" no menu lateral
2. Encontre o cliente que está logado na Aba 2
3. Clique em "Gerenciar Saldo"
4. Preencha:
   - Tipo: **Crédito** (ou Reembolso)
   - Valor: **R$ 1,00**
   - Descrição: "Teste de som"
5. Clique em "Salvar"

### 4. Verificar Logs do Frontend (Aba 2 - Console)

**Logs esperados:**
```javascript
[Store] Received notification: { ... }
[Store] Notification received: { 
  type: 'balance_updated', 
  title: 'Saldo Adicionado', 
  playSound: true 
}
[Store] ✅ playSound flag is TRUE - attempting to play money sound
[Store] ✅ Money sound played successfully
```

**Se aparecer:**
```javascript
[Store] ❌ playSound flag is FALSE or undefined - not playing money sound
```
→ **Problema:** Backend não enviou `playSound: true`

### 5. Verificar Logs do Backend (Terminal do Servidor)

**Logs esperados:**
```
[Balance] Checking if should play sound: { 
  amount: 100, 
  type: 'credit', 
  isPositiveCredit: true 
}
[Balance] Sending notification with playSound=true to customer 180002
[Balance] Notification sent successfully
[Notifications] Sending to customer 180002: balance_updated
```

**Se não aparecer:**
→ **Problema:** Backend não detectou crédito positivo

## Diagnóstico de Problemas

### Problema 1: SSE não conecta
**Sintoma:** Nenhum log de `[Notifications] Connecting to SSE` no console

**Causa possível:**
- Cliente não está logado no painel de vendas
- `customerId` é `null` ou `undefined`

**Solução:**
- Fazer logout e login novamente no painel de vendas
- Verificar se `customer?.id` existe no StoreLayout

### Problema 2: playSound é false ou undefined
**Sintoma:** Log `[Store] ❌ playSound flag is FALSE or undefined`

**Causa possível:**
- Backend não detectou crédito positivo
- Tipo enviado não é `'credit'` ou `'refund'`
- Valor enviado é negativo ou zero

**Solução:**
- Verificar logs do backend: `[Balance] Checking if should play sound`
- Garantir que tipo é "Crédito" (não "Débito")
- Garantir que valor é positivo (> R$ 0,00)

### Problema 3: Som não toca mesmo com playSound=true
**Sintoma:** Log `[Store] ✅ playSound flag is TRUE` mas sem som

**Causa possível:**
- Arquivo `money-received.wav` não existe
- Navegador bloqueou autoplay de áudio
- Volume do navegador está mudo

**Solução:**
- Verificar se arquivo existe: `/home/ubuntu/smshub-admin/client/public/sounds/money-received.wav`
- Verificar se navegador permite autoplay (Chrome pode bloquear)
- Verificar volume do sistema e do navegador

### Problema 4: Erro ao reproduzir som
**Sintoma:** Log `[Store] ❌ Failed to play sound: [erro]`

**Causa possível:**
- Arquivo corrompido
- Formato não suportado
- Permissões de arquivo

**Solução:**
- Verificar integridade do arquivo (541KB)
- Testar arquivo manualmente: `file /home/ubuntu/smshub-admin/client/public/sounds/money-received.wav`
- Re-upload do arquivo se necessário

## Checklist de Validação

- [ ] Cliente está logado no painel de vendas
- [ ] SSE conectado (log `[Notifications] SSE connection opened`)
- [ ] Admin adicionou saldo positivo (Crédito ou Reembolso)
- [ ] Backend detectou crédito positivo (log `isPositiveCredit: true`)
- [ ] Backend enviou notificação (log `Sending notification with playSound=true`)
- [ ] Frontend recebeu notificação (log `[Store] Received notification`)
- [ ] Frontend detectou playSound=true (log `✅ playSound flag is TRUE`)
- [ ] Som tocou com sucesso (log `✅ Money sound played successfully`)
- [ ] Som audível (volume do navegador não está mudo)

## Resultado Esperado

✅ **Sucesso:** Som de moedas caindo toca imediatamente quando admin adiciona saldo positivo ao cliente logado.

❌ **Falha:** Identificar qual etapa falhou e reportar logs específicos.
