# Análise de Reloads no Painel de Vendas

## Investigação Realizada

### 1. Verificação de Reloads Explícitos
**Status:** ✅ **NENHUM PROBLEMA ENCONTRADO**

Busquei por padrões que causam reloads explícitos:
- `router.refresh()` - Não encontrado
- `navigate(0)` - Não encontrado  
- `window.location.reload()` - Encontrado apenas em ErrorBoundary (comportamento esperado)
- `location.reload()` - Não encontrado

**Conclusão:** Não há reloads de página sendo disparados intencionalmente no código.

---

### 2. Análise do SSE (Server-Sent Events)
**Status:** ✅ **IMPLEMENTAÇÃO CORRETA**

#### Arquitetura SSE
- **Centralizado:** SSE está centralizado no `StoreAuthContext`
- **Hook único:** `useNotifications` gerencia a conexão SSE
- **Deduplicação:** Backend deduplica conexões por `customerId`
- **Reconexão:** Usa exponential backoff (1s → 32s)

#### Fluxo de Notificações
```typescript
SSE Event → useNotifications → StoreAuthContext → onNotification callback
```

#### Invalidações Causadas por SSE
O SSE invalida queries específicas quando recebe notificações:

**StoreAuthContext (linhas 63-75):**
```typescript
if (notification.type === 'pix_payment_confirmed' || notification.type === 'balance_updated') {
  utils.store.getCustomer.invalidate();
  utils.recharges.getMyRecharges.invalidate();
}
if (notification.type === 'sms_received' || notification.type === 'activation_expired') {
  utils.store.getMyActivations.invalidate();
}
if (notification.type === 'operation_completed' || notification.type === 'operation_failed') {
  utils.store.getMyActivations.invalidate();
  utils.store.getCustomer.invalidate();
}
utils.notifications.getAll.invalidate();
```

**StoreLayout (linhas 115-138):**
```typescript
if (lastNotification.type === 'operation_completed' && lastNotification.data?.operation === 'purchase') {
  utils.store.getMyActivations.invalidate();
}
if (lastNotification.type === 'operation_failed' && lastNotification.data?.operation === 'purchase') {
  utils.store.getMyActivations.invalidate();
}
```

**Conclusão:** SSE invalida queries específicas, não força reload global.

---

### 3. Análise de Invalidações tRPC
**Status:** ⚠️ **POSSÍVEL CAUSA DOS RELOADS**

#### Invalidações Encontradas (34 ocorrências em 12 arquivos)

**Mais frequentes:**
- `utils.store.getMyActivations.invalidate()` - 8 ocorrências
- `utils.store.getCustomer.invalidate()` - 6 ocorrências
- `utils.countries.getAll.invalidate()` - 5 ocorrências
- `utils.notifications.getAll.invalidate()` - 1 ocorrência (sempre chamada)

#### Problema Identificado: Invalidação em Cascata

**Cenário 1: Notificação SSE chega**
```
1. SSE recebe notification
2. StoreAuthContext invalida queries
3. StoreLayout escuta lastNotification
4. StoreLayout invalida queries novamente
5. Componentes re-renderizam
```

**Cenário 2: Compra de número**
```
1. Usuário compra número
2. Backend processa
3. SSE envia 'operation_completed'
4. StoreAuthContext invalida getMyActivations + getCustomer
5. StoreLayout escuta e invalida getMyActivations novamente
6. Toast é mostrado
7. Componentes re-renderizam
```

**Cenário 3: Notificações sempre invalidadas**
```typescript
// StoreAuthContext linha 74
utils.notifications.getAll.invalidate(); // ← Chamado para TODA notificação
```

Isso significa que **toda notificação SSE** invalida a query de notificações, mesmo que não seja necessário.

---

### 4. Análise de Queries com Refetch
**Status:** ✅ **CONFIGURAÇÃO CONSERVADORA**

Todas as queries principais têm configuração conservadora:

```typescript
// StoreLayout
servicesQuery: refetchOnWindowFocus: false, staleTime: 5min
countriesQuery: refetchOnWindowFocus: false, staleTime: 10min
pricesQuery: refetchOnWindowFocus: false, staleTime: 2min
operatorsQuery: refetchOnWindowFocus: false, staleTime: 5min
favoritesQuery: refetchOnWindowFocus: false, staleTime: 1min
activationsQuery: refetchOnWindowFocus: false, staleTime: 2min

// StoreAuthContext
getCustomerQuery: refetchOnWindowFocus: false, staleTime: 5min
```

**Conclusão:** Queries não estão fazendo refetch automático excessivo.

---

### 5. Análise de useEffect
**Status:** ⚠️ **POSSÍVEL CAUSA**

#### useEffect que escuta lastNotification

**StoreLayout (linhas 115-138):**
```typescript
useEffect(() => {
  if (lastNotification) {
    // Processa notificação e invalida queries
  }
}, [lastNotification, utils]);
```

**Problema:** Toda vez que `lastNotification` muda, o useEffect dispara e pode invalidar queries, causando re-render.

#### useEffect que detecta novos SMS (linhas 176-212)

```typescript
useEffect(() => {
  if (!activationsQuery.data || !isAuthenticated) return;
  
  // Compara activations anteriores com atuais
  // Mostra toast quando detecta novo SMS
}, [activationsQuery.data, isAuthenticated]);
```

**Problema:** Quando `activationsQuery.data` muda (devido a invalidação), este useEffect dispara e pode causar re-render adicional.

---

## Causas Prováveis dos Reloads

### 🔴 Causa Principal: Invalidação Duplicada
1. SSE envia notificação
2. `StoreAuthContext` invalida queries
3. `StoreLayout` escuta `lastNotification` e invalida as mesmas queries novamente
4. Componentes re-renderizam múltiplas vezes

### 🟡 Causa Secundária: Invalidação Excessiva de Notificações
```typescript
utils.notifications.getAll.invalidate(); // Chamado para TODA notificação
```

Isso força re-render mesmo quando não há mudança real nas notificações.

### 🟡 Causa Terciária: useEffect em Cascata
- `lastNotification` muda → useEffect dispara → invalida queries
- `activationsQuery.data` muda → useEffect dispara → processa dados
- Múltiplos useEffect reagindo à mesma mudança

---

## Soluções Propostas

### ✅ Solução 1: Remover Invalidação Duplicada no StoreLayout
**Problema:** StoreLayout invalida queries que já foram invalidadas pelo StoreAuthContext

**Solução:** Remover o useEffect que escuta `lastNotification` no StoreLayout (linhas 115-138), pois o StoreAuthContext já faz isso.

### ✅ Solução 2: Invalidar Notificações Apenas Quando Necessário
**Problema:** `utils.notifications.getAll.invalidate()` é chamado para toda notificação

**Solução:** Invalidar apenas quando a notificação for do tipo que afeta a lista de notificações (ex: `admin_notification`).

### ✅ Solução 3: Debounce nas Invalidações
**Problema:** Múltiplas invalidações em sequência rápida

**Solução:** Adicionar debounce de 100-200ms nas invalidações para agrupar múltiplas chamadas.

### ✅ Solução 4: Usar Referências Estáveis
**Problema:** `utils` pode estar mudando de referência

**Solução:** Memoizar callbacks ou usar `useRef` para evitar re-criação de funções.

---

## Recomendações

### Prioridade Alta
1. **Remover invalidação duplicada no StoreLayout** - Isso deve eliminar a maioria dos reloads
2. **Invalidar notificações seletivamente** - Reduzir re-renders desnecessários

### Prioridade Média
3. **Adicionar debounce nas invalidações** - Agrupar múltiplas invalidações
4. **Otimizar useEffect** - Usar dependências mais específicas

### Prioridade Baixa
5. **Adicionar logs de debug** - Para rastrear quando invalidações acontecem
6. **Considerar React Query devtools** - Para visualizar queries sendo invalidadas

---

## Próximos Passos

1. Implementar Solução 1 (remover invalidação duplicada)
2. Implementar Solução 2 (invalidação seletiva de notificações)
3. Testar comportamento no painel
4. Se necessário, implementar Soluções 3 e 4

---

## Notas Técnicas

### Por que invalidações causam "reloads"?
Quando uma query é invalidada:
1. tRPC marca a query como "stale"
2. Se o componente está montado e a query está sendo usada, tRPC automaticamente refetch
3. Durante o refetch, o componente pode mostrar loading state
4. Quando os dados chegam, o componente re-renderiza com novos dados

**Isso pode parecer um "reload" para o usuário**, especialmente se:
- Múltiplas queries são invalidadas ao mesmo tempo
- Loading states são visíveis (spinners, skeletons)
- Animações de transição são disparadas

### Diferença entre Reload e Re-render
- **Reload:** Navegador recarrega a página (URL muda, JavaScript reinicia)
- **Re-render:** React atualiza o DOM sem recarregar a página

O que o usuário está vendo é **re-render**, não reload. Mas se for muito frequente ou com loading states visíveis, pode parecer um reload.
