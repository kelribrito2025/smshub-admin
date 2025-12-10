# Auditoria: Erro 429 (Too Many Requests)

## Data: 2025-01-10

---

## 🔍 Resumo Executivo

Após análise completa do código, identifiquei **4 problemas críticos** que causam requisições duplicadas e erro 429:

1. ✅ **SSE está correto** - Implementação com BroadcastChannel e circuit breaker está adequada
2. ⚠️ **Problema 1**: Query `getCustomer` sendo executada 2x (StoreAuthContext + invalidações frequentes)
3. ⚠️ **Problema 2**: Invalidações em cascata após notificações SSE
4. ⚠️ **Problema 3**: Queries sem `enabled` adequado carregando desnecessariamente
5. ⚠️ **Problema 4**: Falta de debounce em invalidações de queries

---

## 📊 Análise Detalhada

### ✅ 1. SSE (Server-Sent Events) - CORRETO

**Arquivo**: `client/src/hooks/useNotifications.ts`

**Status**: ✅ Implementação está EXCELENTE

**Pontos positivos**:
- BroadcastChannel para compartilhar notificações entre abas
- Leader election (apenas 1 aba cria conexão SSE)
- Circuit breaker após 5 falhas consecutivas (60s de timeout)
- Backoff exponencial (max 60s)
- Cleanup adequado no unmount

**Conclusão**: SSE NÃO é a causa do erro 429.

---

### ⚠️ 2. Query `getCustomer` Duplicada - PROBLEMA CRÍTICO

**Arquivo**: `client/src/contexts/StoreAuthContext.tsx` (linha 51-59)

**Problema**:
```tsx
const getCustomerQuery = trpc.store.getCustomer.useQuery(
  { customerId: customer?.id || 0 },
  { 
    enabled: !!customer?.id,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
  }
);
```

**Invalidações frequentes** (linhas 70-90):
```tsx
if (notification.type === 'pix_payment_confirmed' || notification.type === 'balance_updated') {
  utils.store.getCustomer.refetch(); // ❌ REFETCH IMEDIATO (ignora staleTime)
  utils.recharges.getMyRecharges.invalidate();
}
if (notification.type === 'operation_completed' || notification.type === 'operation_failed') {
  utils.store.getMyActivations.invalidate();
  utils.store.getCustomer.invalidate(); // ❌ INVALIDAÇÃO ADICIONAL
}
```

**Impacto**:
- Query `getCustomer` é executada **múltiplas vezes** devido a invalidações frequentes
- `refetch()` **ignora staleTime** e força requisição imediata
- Notificações SSE disparam invalidações em cascata

**Solução**:
1. Remover `refetch()` e usar apenas `invalidate()` (respeita staleTime)
2. Adicionar debounce para evitar múltiplas invalidações seguidas
3. Consolidar invalidações (evitar duplicatas)

---

### ⚠️ 3. Invalidações em Cascata - PROBLEMA CRÍTICO

**Arquivo**: `client/src/contexts/StoreAuthContext.tsx` (linhas 66-92)

**Problema**:
Cada notificação SSE dispara **múltiplas invalidações** sem debounce:

```tsx
onNotification: (notification) => {
  // Notificação 1: pix_payment_confirmed
  if (notification.type === 'pix_payment_confirmed' || notification.type === 'balance_updated') {
    utils.store.getCustomer.refetch(); // ❌ Requisição 1
    utils.recharges.getMyRecharges.invalidate(); // ❌ Requisição 2
  }
  
  // Notificação 2: operation_completed (logo após)
  if (notification.type === 'operation_completed' || notification.type === 'operation_failed') {
    utils.store.getMyActivations.invalidate(); // ❌ Requisição 3
    utils.store.getCustomer.invalidate(); // ❌ Requisição 4 (DUPLICADA!)
  }
}
```

**Cenário real**:
1. Usuário faz pagamento PIX
2. Backend envia notificação `pix_payment_confirmed` → 2 requisições
3. Backend envia notificação `balance_updated` → 2 requisições
4. Backend envia notificação `operation_completed` → 2 requisições
5. **Total: 6 requisições em < 1 segundo** → Erro 429

**Solução**:
- Adicionar debounce de 500ms nas invalidações
- Consolidar invalidações (evitar duplicatas)
- Usar `invalidate()` ao invés de `refetch()`

---

### ⚠️ 4. Queries sem `enabled` Adequado

**Arquivo**: `client/src/components/StoreLayout.tsx` (linhas 67-102)

**Problema**:
Algumas queries carregam desnecessariamente:

```tsx
// ✅ BOM: enabled condicional
const pricesQuery = trpc.store.getPrices.useQuery({}, {
  enabled: !!servicesQuery.data && !!countriesQuery.data, // ✅ Correto
});

// ⚠️ PROBLEMA: enabled apenas por autenticação
const favoritesQuery = trpc.store.getFavorites.useQuery(
  { customerId: customer?.id || 0 },
  { 
    enabled: !!customer?.id && !!servicesQuery.data, // ⚠️ Carrega sempre que autenticado
  }
);
```

**Impacto**:
- Queries carregam mesmo quando não são necessárias
- Aumenta número de requisições simultâneas

**Solução**:
- Adicionar `enabled` baseado na página atual (usar `useLocation()`)
- Carregar favoritos apenas na página de catálogo

---

### ⚠️ 5. Falta de Debounce em Invalidações

**Problema geral**:
Não há debounce nas invalidações de queries após notificações SSE.

**Exemplo**:
```tsx
// ❌ SEM DEBOUNCE
utils.store.getCustomer.invalidate();
utils.store.getMyActivations.invalidate();
utils.recharges.getMyRecharges.invalidate();
```

**Solução**:
Criar helper com debounce:
```tsx
const debouncedInvalidate = useMemo(() => {
  const timeouts = new Map<string, NodeJS.Timeout>();
  
  return (queryKey: string, invalidateFn: () => void, delay = 500) => {
    if (timeouts.has(queryKey)) {
      clearTimeout(timeouts.get(queryKey)!);
    }
    
    const timeout = setTimeout(() => {
      invalidateFn();
      timeouts.delete(queryKey);
    }, delay);
    
    timeouts.set(queryKey, timeout);
  };
}, []);
```

---

## 🔧 Correções Necessárias

### 1. Remover `refetch()` e usar apenas `invalidate()`

**Arquivo**: `client/src/contexts/StoreAuthContext.tsx`

**Antes**:
```tsx
if (notification.type === 'pix_payment_confirmed' || notification.type === 'balance_updated') {
  utils.store.getCustomer.refetch(); // ❌ Ignora staleTime
  utils.recharges.getMyRecharges.invalidate();
}
```

**Depois**:
```tsx
if (notification.type === 'pix_payment_confirmed' || notification.type === 'balance_updated') {
  utils.store.getCustomer.invalidate(); // ✅ Respeita staleTime
  utils.recharges.getMyRecharges.invalidate();
}
```

---

### 2. Adicionar Debounce nas Invalidações

**Criar hook customizado**:
```tsx
function useDebouncedInvalidate() {
  const timeoutsRef = useRef(new Map<string, NodeJS.Timeout>());
  
  const invalidate = useCallback((key: string, fn: () => void, delay = 500) => {
    const timeouts = timeoutsRef.current;
    
    if (timeouts.has(key)) {
      clearTimeout(timeouts.get(key)!);
    }
    
    const timeout = setTimeout(() => {
      fn();
      timeouts.delete(key);
    }, delay);
    
    timeouts.set(key, timeout);
  }, []);
  
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);
  
  return invalidate;
}
```

**Usar no StoreAuthContext**:
```tsx
const debouncedInvalidate = useDebouncedInvalidate();

onNotification: (notification) => {
  if (notification.type === 'pix_payment_confirmed' || notification.type === 'balance_updated') {
    debouncedInvalidate('customer', () => utils.store.getCustomer.invalidate());
    debouncedInvalidate('recharges', () => utils.recharges.getMyRecharges.invalidate());
  }
}
```

---

### 3. Consolidar Invalidações Duplicadas

**Antes**:
```tsx
if (notification.type === 'pix_payment_confirmed' || notification.type === 'balance_updated') {
  utils.store.getCustomer.refetch();
  utils.recharges.getMyRecharges.invalidate();
}
if (notification.type === 'operation_completed' || notification.type === 'operation_failed') {
  utils.store.getMyActivations.invalidate();
  utils.store.getCustomer.invalidate(); // ❌ DUPLICADA
}
```

**Depois**:
```tsx
// Consolidar todas as invalidações
const invalidations = new Set<string>();

if (notification.type === 'pix_payment_confirmed' || notification.type === 'balance_updated') {
  invalidations.add('customer');
  invalidations.add('recharges');
}
if (notification.type === 'operation_completed' || notification.type === 'operation_failed') {
  invalidations.add('activations');
  invalidations.add('customer');
}

// Executar apenas uma vez cada
if (invalidations.has('customer')) {
  debouncedInvalidate('customer', () => utils.store.getCustomer.invalidate());
}
if (invalidations.has('recharges')) {
  debouncedInvalidate('recharges', () => utils.recharges.getMyRecharges.invalidate());
}
if (invalidations.has('activations')) {
  debouncedInvalidate('activations', () => utils.store.getMyActivations.invalidate());
}
```

---

### 4. Otimizar `enabled` em Queries

**Arquivo**: `client/src/components/StoreLayout.tsx`

**Adicionar verificação de página**:
```tsx
const [location] = useLocation();
const isCatalogPage = location === '/';

const favoritesQuery = trpc.store.getFavorites.useQuery(
  { customerId: customer?.id || 0 },
  { 
    enabled: !!customer?.id && !!servicesQuery.data && isCatalogPage, // ✅ Apenas na página de catálogo
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  }
);
```

---

## 📈 Impacto Esperado

### Antes das Correções:
- **Cenário**: Pagamento PIX confirmado
- **Requisições**: 6-8 requisições simultâneas
- **Tempo**: < 1 segundo
- **Resultado**: Erro 429 (Too Many Requests)

### Após as Correções:
- **Cenário**: Pagamento PIX confirmado
- **Requisições**: 2-3 requisições (com debounce de 500ms)
- **Tempo**: ~1 segundo (espaçadas)
- **Resultado**: ✅ Sem erro 429

---

## 🎯 Prioridade de Implementação

1. **ALTA**: Remover `refetch()` e usar `invalidate()` (StoreAuthContext)
2. **ALTA**: Adicionar debounce nas invalidações
3. **MÉDIA**: Consolidar invalidações duplicadas
4. **BAIXA**: Otimizar `enabled` em queries (melhoria de performance)

---

## 🧪 Como Testar

1. Abrir console do navegador (F12)
2. Ir para aba "Network"
3. Filtrar por "trpc"
4. Fazer pagamento PIX de teste
5. Observar número de requisições após confirmação
6. **Esperado**: Máximo 3 requisições espaçadas por 500ms
7. **Não esperado**: Múltiplas requisições simultâneas ou erro 429

---

## 📝 Conclusão

O erro 429 é causado principalmente por:
1. Uso de `refetch()` ao invés de `invalidate()`
2. Falta de debounce nas invalidações
3. Invalidações duplicadas após notificações SSE

A implementação do SSE está correta e não é a causa do problema.

As correções propostas devem eliminar completamente o erro 429.


---

## 🔍 Análise de useEffects

### StoreLayout.tsx

**useEffect 1 - Notificações UI** (linha 115-132):
```tsx
useEffect(() => {
  if (lastNotification) {
    if (lastNotification.type === 'operation_completed' && lastNotification.data?.operation === 'purchase') {
      const now = Date.now();
      if (now - lastPurchaseNotification.current < 2000) {
        return; // ✅ Debounce correto
      }
      lastPurchaseNotification.current = now;
      toast.success(...);
      playNotificationSound('purchase');
    }
  }
}, [lastNotification]);
```
**Status**: ✅ Correto - Apenas UI, não dispara queries

---

**useEffect 2 - Selecionar Brasil como padrão** (linha 149-156):
```tsx
useEffect(() => {
  if (countriesQuery.data && selectedCountry === null) {
    const brazil = countriesQuery.data.find((c: any) => c.code === 'brazil');
    if (brazil) {
      setSelectedCountry(brazil.id);
    }
  }
}, [countriesQuery.data, selectedCountry]);
```
**Status**: ✅ Correto - Apenas setState, não dispara queries

---

**useEffect 3 - Reset favoritos ao deslogar** (linha 159-164):
```tsx
useEffect(() => {
  if (!isAuthenticated && showFavorites) {
    setShowFavorites(false);
    localStorage.setItem('store_show_favorites', 'false');
  }
}, [isAuthenticated, showFavorites]);
```
**Status**: ✅ Correto - Apenas localStorage, não dispara queries

---

**useEffect 4 - Flash de saldo** (linha 318-328):
```tsx
useEffect(() => {
  if (previousBalance.current !== null && previousBalance.current !== displayBalance) {
    const diff = displayBalance - previousBalance.current;
    if (diff > 0) {
      setBalanceFlash('green');
      setTimeout(() => setBalanceFlash(null), 800);
    } else if (diff < 0) {
      setBalanceFlash('red');
      setTimeout(() => setBalanceFlash(null), 800);
    }
  }
  previousBalance.current = displayBalance;
}, [displayBalance]);
```
**Status**: ✅ Correto - Apenas animação UI, não dispara queries

---

### StoreAuthContext.tsx

**useEffect 1 - Carregar customer do localStorage** (linha 96-107):
```tsx
useEffect(() => {
  const storedCustomer = localStorage.getItem('store_customer');
  if (storedCustomer) {
    try {
      setCustomer(JSON.parse(storedCustomer));
    } catch (error) {
      console.error('Failed to parse stored customer:', error);
      localStorage.removeItem('store_customer');
    }
  }
  setIsLoading(false);
}, []);
```
**Status**: ✅ Correto - Apenas carregamento inicial, não dispara queries

---

**useEffect 2 - Prefetch lazy** (linha 110-120):
```tsx
useEffect(() => {
  if (customer?.id) {
    const timer = setTimeout(() => {
      utils.store.getMyActivations.prefetch({ customerId: customer.id });
      utils.recharges.getMyRecharges.prefetch({ customerId: customer.id });
    }, 2000); // 2 segundos de delay
    
    return () => clearTimeout(timer);
  }
}, [customer?.id, utils]);
```
**Status**: ✅ Correto - Prefetch com delay, não causa sobrecarga

---

**useEffect 3 - Atualizar customer após query** (linha 122-137):
```tsx
useEffect(() => {
  if (getCustomerQuery.data) {
    setCustomer(getCustomerQuery.data);
    localStorage.setItem('store_customer', JSON.stringify(getCustomerQuery.data));
    
    if (getCustomerQuery.data.banned) {
      setIsBannedModalOpen(true);
    }
  } else if (getCustomerQuery.data === null && customer) {
    setCustomer(null);
    localStorage.removeItem('store_customer');
  }
}, [getCustomerQuery.data, customer]);
```
**Status**: ⚠️ **PROBLEMA POTENCIAL** - Dependência `customer` pode causar loop

**Explicação**:
- `useEffect` depende de `customer`
- Dentro do `useEffect`, fazemos `setCustomer(getCustomerQuery.data)`
- Isso atualiza `customer`, que dispara o `useEffect` novamente
- Porém, a condição `if (getCustomerQuery.data)` previne loop infinito

**Conclusão**: ✅ Seguro, mas pode ser otimizado

**Otimização sugerida**:
```tsx
useEffect(() => {
  if (getCustomerQuery.data) {
    setCustomer(getCustomerQuery.data);
    localStorage.setItem('store_customer', JSON.stringify(getCustomerQuery.data));
    
    if (getCustomerQuery.data.banned) {
      setIsBannedModalOpen(true);
    }
  } else if (getCustomerQuery.data === null) { // ✅ Remover dependência de customer
    setCustomer(null);
    localStorage.removeItem('store_customer');
  }
}, [getCustomerQuery.data]); // ✅ Remover customer das dependências
```

---

## 📊 Conclusão da Análise de useEffects

**Resultado**: ✅ Nenhum useEffect está causando refetch desnecessário

**Pontos positivos**:
- Todos os useEffects têm dependências estáveis
- Nenhum useEffect chama `refetch()` ou `invalidate()`
- Debounce está implementado onde necessário (notificações de compra)

**Otimização menor**:
- Remover dependência `customer` do useEffect 3 em StoreAuthContext.tsx (prevenir possível loop)
