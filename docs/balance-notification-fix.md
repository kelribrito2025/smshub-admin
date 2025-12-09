# Correção: Notificação de Saldo Adicionado

## Problema Reportado

Usuário não recebia notificação visual/sonora quando admin adicionava saldo à sua conta, mesmo usando navegadores diferentes (Chrome para admin, Safari para usuário).

## Diagnóstico

### Fluxo Esperado

```
Admin adiciona saldo → Backend envia SSE → Frontend recebe → Toast verde + Som 💰
```

### Fluxo Real (Antes da Correção)

```
Admin adiciona saldo → Backend envia SSE ✅ → Frontend recebe ✅ → Toast azul silencioso ❌
```

### Causa Raiz

O backend enviava corretamente a notificação com `playSound: true`:

```typescript
// server/routers/customers.ts (linha 155-163)
if (isPositiveCredit) {
  notificationsManager.sendToCustomer(input.customerId, {
    type: 'balance_updated',
    title: 'Saldo Adicionado',
    message: `Novo saldo: R$ ${(result.balanceAfter / 100).toFixed(2)}`,
    playSound: true, // ✅ Flag enviado corretamente
  });
}
```

Mas o frontend **ignorava** o flag `playSound`:

```typescript
// client/src/hooks/useNotifications.ts (ANTES - linha 185-189)
case "balance_updated":
  toast.info(notification.title, {  // ❌ Sempre toast.info (azul, sem som)
    description: notification.message,
    duration: 3000,
  });
  break;
```

## Solução Implementada

Modificado `client/src/hooks/useNotifications.ts` para verificar o flag `playSound`:

```typescript
case "balance_updated":
  // If admin added balance (playSound flag), show success toast with money icon
  if (notification.playSound) {
    toast.success(notification.title, {
      description: notification.message,
      duration: 5000,
      icon: "💰",
    });
    // Play money sound
    const audio = new Audio('/sounds/money-received.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('[Notifications] Could not play sound:', err));
  } else {
    // Regular balance update (no sound)
    toast.info(notification.title, {
      description: notification.message,
      duration: 3000,
    });
  }
  break;
```

## Comportamento Após Correção

### Quando Admin Adiciona Saldo (Crédito/Reembolso)

- ✅ Toast **verde** com ícone 💰
- ✅ Som de dinheiro toca (`/sounds/money-received.mp3`)
- ✅ Duração: 5 segundos
- ✅ Saldo atualiza automaticamente

### Quando Ocorre Atualização Regular de Saldo

- ℹ️ Toast **azul** sem ícone especial
- 🔇 Sem som
- ℹ️ Duração: 3 segundos

## Condições para Notificação com Som

Backend envia `playSound: true` apenas quando:

1. **Tipo de transação:** `credit` OU `refund`
2. **Valor:** Positivo (> 0)

```typescript
const isPositiveCredit = input.amount > 0 && (input.type === 'credit' || input.type === 'refund');
```

**Tipos que NÃO disparam som:**
- `debit` (débito)
- `purchase` (compra)
- `withdrawal` (saque)
- `hold` (retenção)

## Testes Unitários

Criado `server/balance-notification.test.ts` com 4 casos de teste:

1. ✅ Notificação enviada quando admin adiciona crédito
2. ✅ Notificação enviada quando admin faz reembolso
3. ✅ Notificação NÃO enviada quando admin debita saldo
4. ✅ Notificação NÃO enviada para compras (tipo purchase)

**Resultado:** 4/4 testes passaram

## Arquivos Modificados

1. `client/src/hooks/useNotifications.ts` (linha 185-204)
   - Adicionado verificação de `notification.playSound`
   - Implementado reprodução de som
   - Diferenciado toast verde (com som) vs azul (silencioso)

2. `server/balance-notification.test.ts` (novo arquivo)
   - Testes unitários para validar lógica de notificação

3. `todo.md`
   - Marcado bug como resolvido

## Arquivos de Som Utilizados

- **Caminho:** `/sounds/money-received.mp3`
- **Tamanho:** 1.2 MB
- **Volume:** 50% (0.5)
- **Fallback:** Se som não carregar, apenas toast visual aparece (graceful degradation)

## Compatibilidade

- ✅ Chrome/Safari (testado)
- ✅ Navegadores modernos com suporte a `Audio()` API
- ✅ Fallback silencioso se autoplay bloqueado pelo navegador

## Notas Técnicas

### Por que usar `Audio()` em vez de `<audio>` tag?

- Mais flexível para controle programático
- Não requer DOM manipulation
- Permite ajuste de volume antes de tocar
- Melhor para notificações one-shot

### Por que catch() no play()?

Navegadores podem bloquear autoplay de áudio por política de segurança. O catch() garante que o erro não quebre a aplicação - o usuário ainda verá o toast visual mesmo se o som não tocar.

### SSE vs WebSocket

Este projeto usa **Server-Sent Events (SSE)** para notificações em vez de WebSocket porque:

- Unidirecional (servidor → cliente) é suficiente para notificações
- Mais simples de implementar e debugar
- Reconexão automática nativa
- Menor overhead de protocolo

## Referências

- Backend: `server/routers/customers.ts` (linha 138-172)
- SSE Manager: `server/notifications-manager.ts`
- SSE Endpoint: `server/notifications-sse.ts`
- Frontend Hook: `client/src/hooks/useNotifications.ts`
- Uso no Layout: `client/src/components/StoreLayout.tsx` (linha 193-196)
