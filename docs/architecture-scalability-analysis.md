# Análise de Arquitetura e Escalabilidade - SMS Hub Admin

**Data:** 07 de Dezembro de 2025  
**Autor:** Análise Técnica Manus  
**Versão:** 1.0

---

## 📋 Sumário Executivo

Este documento analisa a capacidade da arquitetura atual do SMS Hub Admin de suportar crescimento de usuários (até 1.000 simultâneos) e avalia a necessidade de migração para microserviços. A análise considera os sistemas recentemente implementados: validações de compra, limite de pedidos simultâneos, controle de cancelamentos e bloqueios temporários.

**Conclusão Antecipada:** A arquitetura monolítica atual é **suficiente e recomendada** para o cenário de 1.000 usuários simultâneos. Microserviços **não são necessários** neste momento e trariam mais complexidade do que benefícios.

---

## 🏗️ Arquitetura Atual

### Stack Tecnológica

**Backend:**
- **Runtime:** Node.js 22.13.0 (single-threaded event loop)
- **Framework:** Express 4 + tRPC 11
- **Database:** MySQL/TiDB (relacional, ACID-compliant)
- **ORM:** Drizzle ORM 0.44.6
- **Concorrência:** Operation Lock Manager (mutex por cliente)

**Frontend:**
- **Framework:** React 19 + Wouter (SPA)
- **State Management:** TanStack Query (React Query)
- **UI:** Tailwind CSS 4 + shadcn/ui

**Infraestrutura:**
- **Hosting:** Manus Cloud (managed)
- **Database:** TiDB Cloud (distributed MySQL-compatible)
- **Storage:** S3-compatible object storage
- **CDN:** Manus CDN para assets estáticos

### Padrões Arquiteturais Implementados

1. **Monolito Modular:** Código organizado em routers, helpers e clients
2. **Transaction Script:** Procedures tRPC como unidades de negócio
3. **Repository Pattern:** Helpers abstraem acesso ao banco
4. **Optimistic Locking:** `operation-lock.ts` previne race conditions
5. **Event-Driven (parcial):** Notificações via SSE (Server-Sent Events)

---

## 📊 Análise de Capacidade: 1.000 Usuários Simultâneos

### Definição de "Simultâneo"

Para esta análise, consideramos:
- **1.000 usuários ativos:** Navegando, consultando catálogo, vendo ativações
- **100 compras/minuto:** ~1.67 compras/segundo (pico)
- **50 cancelamentos/minuto:** ~0.83 cancelamentos/segundo (pico)
- **200 requisições/segundo:** Total de operações (leitura + escrita)

### Capacidade do Backend (Node.js + Express)

**Throughput Teórico:**
- Node.js single-threaded: **10.000-15.000 req/s** (operações I/O-bound)
- Express + tRPC overhead: **~8.000 req/s** (com serialização)
- **Nosso cenário:** 200 req/s = **2.5% da capacidade**

**Latência Esperada:**
- Queries simples (SELECT): **5-20ms**
- Queries com JOIN: **20-50ms**
- Transações (INSERT + UPDATE): **30-80ms**
- APIs externas (SMSHub, SMS24h): **500-2000ms** (fora do nosso controle)

**Conclusão:** Backend Node.js **não é gargalo** para 1.000 usuários.

### Capacidade do Banco de Dados (TiDB)

**TiDB Cloud Specs (assumindo tier básico):**
- **Conexões simultâneas:** 1.000-2.000
- **Queries/segundo:** 5.000-10.000 (leitura)
- **Writes/segundo:** 1.000-2.000 (escrita)

**Nosso Uso Estimado:**
- **Leituras:** ~150 req/s (catálogo, ativações, saldos)
- **Escritas:** ~50 req/s (compras, cancelamentos, logs)
- **Conexões ativas:** ~50-100 (pool de conexões)

**Conclusão:** Banco de dados **não é gargalo** para 1.000 usuários.

### Gargalos Potenciais Identificados

#### 1. **APIs Externas (SMSHub, SMS24h, SMSActivate)**

**Problema:**
- Latência alta (500-2000ms por requisição)
- Rate limits impostos pelos fornecedores
- Timeouts podem bloquear event loop

**Impacto:**
- Compras podem demorar 2-5 segundos
- Usuários podem perceber lentidão

**Mitigação Atual:**
- Timeout de 30 segundos configurado
- Retry logic implementado
- Fallback entre APIs (recomendação automática)

**Recomendação:**
- ✅ **Manter como está** - Latência é inerente às APIs externas
- 🔄 **Considerar:** Cache de disponibilidade de números (TTL 30s)

#### 2. **Operation Lock Manager (Mutex por Cliente)**

**Problema:**
- Operações de um mesmo cliente são serializadas
- Cliente com múltiplas abas pode ter requisições enfileiradas

**Impacto:**
- Latência adicional de 50-200ms por operação enfileirada
- Cliente agressivo (10 req/s) pode ter 500ms de delay

**Mitigação Atual:**
- Lock é liberado após operação (não há lock prolongado)
- Timeout de 30 segundos previne deadlocks

**Recomendação:**
- ✅ **Manter como está** - Previne race conditions críticas (saldo negativo)
- 🔄 **Considerar:** Lock apenas para operações financeiras (compra, cancelamento)

#### 3. **Validações em Série (Limite de Cancelamentos)**

**Problema:**
- Cada compra executa 4 validações em série:
  1. Saldo suficiente
  2. Bloqueio por cancelamentos (**nova**)
  3. Limite de pedidos simultâneos (**nova**)
  4. Disponibilidade na API externa

**Impacto:**
- Latência adicional de **20-40ms** por validação (total: 80-160ms)
- Queries extras no banco (3 SELECTs + 1 COUNT)

**Mitigação Atual:**
- Validações usam índices otimizados
- Queries são simples (WHERE + LIMIT)

**Recomendação:**
- ✅ **Manter como está** - 80-160ms é aceitável para operação crítica
- 🔄 **Considerar:** Cache de bloqueios em memória (Redis) se latência aumentar

#### 4. **Notificações SSE (Server-Sent Events)**

**Problema:**
- Cada cliente mantém 1 conexão HTTP aberta
- 1.000 usuários = 1.000 conexões abertas

**Impacto:**
- Consumo de memória: ~1MB por conexão (1GB total)
- File descriptors: 1.000 (limite padrão: 1024-65536)

**Mitigação Atual:**
- Heartbeat de 30s mantém conexões vivas
- Cleanup automático de conexões mortas

**Recomendação:**
- ✅ **Manter como está** - 1.000 conexões é gerenciável
- 🔄 **Considerar:** Aumentar limite de file descriptors no servidor (ulimit -n 10000)

---

## 🚀 Impacto das Novas Validações na Performance

### Sistema de Limite de Cancelamentos

**Overhead por Compra:**
1. Query `checkCancellationBlock`: **10-20ms**
   ```sql
   SELECT COUNT(*) FROM cancellation_logs 
   WHERE customerId = ? AND apiId = ? 
   AND timestamp >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
   ```
2. Query `getApiById`: **5-10ms** (cache hit provável)

**Total:** 15-30ms por compra

**Overhead por Cancelamento:**
1. Insert `recordCancellation`: **10-20ms**
   ```sql
   INSERT INTO cancellation_logs (customerId, apiId, activationId, timestamp) 
   VALUES (?, ?, ?, NOW())
   ```

**Total:** 10-20ms por cancelamento

**Conclusão:** Overhead **insignificante** (< 2% da latência total).

### Sistema de Limite de Pedidos Simultâneos

**Overhead por Compra:**
1. Query `countActiveOrders`: **15-30ms**
   ```sql
   SELECT COUNT(*) FROM activations 
   WHERE userId = ? AND apiId = ? 
   AND status IN ('pending', 'active')
   ```

**Total:** 15-30ms por compra

**Conclusão:** Overhead **insignificante** (< 2% da latência total).

### Validação de Saldo

**Overhead por Compra:**
1. Query `getCustomerById`: **5-10ms** (índice primário)
2. Comparação em memória: **< 1ms**

**Total:** 5-10ms por compra

**Conclusão:** Overhead **desprezível**.

### Total de Overhead das Validações

**Compra completa:**
- Validações: **35-70ms**
- API externa: **500-2000ms**
- Transação DB: **30-80ms**
- **Total:** 565-2150ms

**Percentual de validações:** 6-12% do tempo total

**Conclusão:** Validações **não são gargalo**. API externa domina a latência.

---

## 🔍 Quando Considerar Microserviços?

### Sinais de Que Microserviços São Necessários

1. **Escalabilidade Independente:**
   - Um módulo precisa escalar 10x mais que outros
   - Exemplo: Sistema de notificações com 100.000 conexões SSE

2. **Times Independentes:**
   - Múltiplos times trabalhando em módulos diferentes
   - Deploy independente é crítico para velocidade

3. **Tecnologias Heterogêneas:**
   - Módulo precisa de linguagem/runtime diferente
   - Exemplo: ML model em Python, API em Node.js

4. **Isolamento de Falhas:**
   - Falha em um módulo não pode derrubar sistema inteiro
   - Exemplo: Sistema de pagamento crítico isolado

5. **Latência Inaceitável:**
   - Monolito não consegue atender SLA (< 200ms)
   - Mesmo após otimizações (cache, índices, queries)

### Nossa Situação Atual

| Critério | Status | Necessita Microserviços? |
|----------|--------|--------------------------|
| Escalabilidade Independente | ❌ Todos os módulos escalam juntos | **Não** |
| Times Independentes | ❌ Time único | **Não** |
| Tecnologias Heterogêneas | ❌ Node.js + MySQL suficiente | **Não** |
| Isolamento de Falhas | ⚠️ Falha em API externa afeta compras | **Não** (mitigado com timeouts) |
| Latência Inaceitável | ❌ Latência OK (< 2s) | **Não** |

**Conclusão:** **Nenhum critério** justifica microserviços no momento.

---

## 📈 Cenários de Crescimento

### Cenário 1: 10.000 Usuários Simultâneos (10x)

**Impacto:**
- Backend: 2.000 req/s = **25% da capacidade** ✅
- Banco: 1.500 leituras/s + 500 escritas/s = **30% da capacidade** ✅
- Notificações SSE: 10.000 conexões = **10GB RAM** ⚠️

**Ação Necessária:**
- ✅ **Escalar verticalmente:** Aumentar RAM do servidor (16GB → 32GB)
- ✅ **Escalar banco:** Upgrade TiDB tier (se necessário)
- 🔄 **Considerar:** WebSockets com load balancer para SSE

**Microserviços necessários?** **Não**. Escala vertical resolve.

### Cenário 2: 100.000 Usuários Simultâneos (100x)

**Impacto:**
- Backend: 20.000 req/s = **250% da capacidade** ❌
- Banco: 15.000 leituras/s + 5.000 escritas/s = **300% da capacidade** ❌
- Notificações SSE: 100.000 conexões = **100GB RAM** ❌

**Ação Necessária:**
- ❌ **Escala vertical não resolve**
- ✅ **Escala horizontal:** Load balancer + múltiplas instâncias
- ✅ **Cache distribuído:** Redis para sessões, bloqueios, catálogo
- ✅ **Read replicas:** Banco de leitura separado
- 🔄 **Considerar:** Microserviços para notificações (serviço dedicado)

**Microserviços necessários?** **Sim**, mas apenas para módulos específicos (notificações, cache).

### Cenário 3: 1.000.000 Usuários Simultâneos (1000x)

**Impacto:**
- Backend: 200.000 req/s = **2500% da capacidade** ❌
- Banco: 150.000 leituras/s + 50.000 escritas/s = **3000% da capacidade** ❌

**Ação Necessária:**
- ✅ **Arquitetura distribuída completa:**
  - API Gateway (Kong, Traefik)
  - Microserviços por domínio (Compras, Cancelamentos, Notificações)
  - Message Queue (RabbitMQ, Kafka) para eventos
  - Cache distribuído (Redis Cluster)
  - Database sharding (por região, por API)

**Microserviços necessários?** **Sim**, arquitetura completa de microserviços.

---

## 🎯 Recomendações para Arquitetura Atual

### ✅ Manter Como Está (Não Alterar)

1. **Monolito modular** - Simplicidade operacional
2. **Operation Lock Manager** - Previne race conditions críticas
3. **Validações em série** - Overhead aceitável (< 100ms)
4. **tRPC + React Query** - Excelente DX e performance

### 🔄 Otimizações Recomendadas (Sem Reescrever)

#### 1. **Cache em Memória (Node.js)**

**Implementar:**
- Cache de catálogo de serviços (TTL: 5 minutos)
- Cache de configurações de APIs (TTL: 10 minutos)
- Cache de bloqueios de cancelamento (TTL: 1 minuto)

**Benefício:**
- Reduz queries ao banco em **30-40%**
- Latência de leitura: **< 1ms** (vs 10-20ms)

**Implementação:**
```typescript
// server/cache.ts
import NodeCache from 'node-cache';

export const serviceCache = new NodeCache({ stdTTL: 300 }); // 5 min
export const apiConfigCache = new NodeCache({ stdTTL: 600 }); // 10 min
export const blockCache = new NodeCache({ stdTTL: 60 }); // 1 min
```

**Esforço:** 2-4 horas  
**Risco:** Baixo (cache pode ser desabilitado)

#### 2. **Índices Compostos no Banco**

**Adicionar:**
```sql
-- Otimizar query de cancelamentos
CREATE INDEX idx_cancellation_logs_lookup 
ON cancellation_logs (customerId, apiId, timestamp DESC);

-- Otimizar query de pedidos ativos
CREATE INDEX idx_activations_active_orders 
ON activations (userId, apiId, status, createdAt DESC);
```

**Benefício:**
- Reduz latência de validações em **50-70%** (20ms → 5ms)

**Esforço:** 30 minutos  
**Risco:** Baixo (índices não afetam lógica)

#### 3. **Connection Pooling Otimizado**

**Ajustar:**
```typescript
// server/db.ts
const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 50, // ← Aumentar de 10 para 50
  queueLimit: 100, // ← Adicionar fila
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});
```

**Benefício:**
- Reduz espera por conexão em picos de tráfego
- Suporta até **500 req/s** sem enfileiramento

**Esforço:** 15 minutos  
**Risco:** Baixo (configuração padrão)

#### 4. **Monitoramento e Alertas**

**Implementar:**
- Métricas de latência por endpoint (P50, P95, P99)
- Alertas de CPU > 80%, RAM > 90%
- Dashboard de queries lentas (> 100ms)

**Ferramentas:**
- **Prometheus + Grafana** (open-source)
- **New Relic / DataDog** (pago, mais fácil)

**Benefício:**
- Detectar gargalos **antes** de afetar usuários
- Baseline para decisões de escala

**Esforço:** 4-8 horas  
**Risco:** Baixo (não afeta código de negócio)

### ❌ Não Recomendado (Evitar)

1. **Migrar para microserviços agora** - Complexidade desnecessária
2. **Adicionar message queue (RabbitMQ, Kafka)** - Overhead sem benefício
3. **Separar banco de leitura/escrita** - Premature optimization
4. **Implementar CQRS** - Over-engineering para escala atual

---

## 📊 Comparação: Monolito vs Microserviços

| Aspecto | Monolito (Atual) | Microserviços |
|---------|------------------|---------------|
| **Complexidade Operacional** | ⭐ Baixa (1 deploy) | ⭐⭐⭐⭐⭐ Alta (10+ deploys) |
| **Latência** | ⭐⭐⭐⭐⭐ Baixa (in-process) | ⭐⭐⭐ Média (network calls) |
| **Debugging** | ⭐⭐⭐⭐⭐ Fácil (stack trace) | ⭐⭐ Difícil (distributed tracing) |
| **Escalabilidade** | ⭐⭐⭐ Vertical (até 10.000 users) | ⭐⭐⭐⭐⭐ Horizontal (ilimitado) |
| **Custo Infraestrutura** | ⭐⭐⭐⭐⭐ Baixo (1 servidor) | ⭐⭐ Alto (10+ servidores) |
| **Velocidade de Desenvolvimento** | ⭐⭐⭐⭐⭐ Rápida (shared code) | ⭐⭐⭐ Lenta (duplicação) |
| **Resiliência** | ⭐⭐⭐ Média (falha derruba tudo) | ⭐⭐⭐⭐⭐ Alta (falha isolada) |
| **Consistência de Dados** | ⭐⭐⭐⭐⭐ Forte (ACID) | ⭐⭐ Eventual (distributed transactions) |

**Para 1.000 usuários:** Monolito **vence** em 6 de 8 critérios.

---

## 🎯 Conclusão Final

### Resposta Direta às Perguntas

**1. Nosso backend atual dá conta de 1.000 usuários simultâneos?**

✅ **Sim, com folga.** Backend está usando apenas **2.5% da capacidade**. Pode suportar até **10.000 usuários** sem alterações significativas.

**2. As validações que estamos adicionando podem impactar performance?**

✅ **Não significativamente.** Overhead de **35-70ms** representa apenas **6-12%** da latência total. API externa (500-2000ms) é o fator dominante.

**3. Existe algum gargalo potencial?**

⚠️ **Sim, mas gerenciáveis:**
- **APIs externas:** Latência alta (inerente, não controlável)
- **Notificações SSE:** 1.000 conexões = 1GB RAM (aceitável)
- **Operation Lock:** Serialização por cliente (necessário para consistência)

Nenhum gargalo **crítico** identificado.

**4. Estamos bem dentro da capacidade do modelo monolítico?**

✅ **Sim, absolutamente.** Monolito pode escalar até **10.000 usuários** com otimizações simples (cache, índices). Para **100.000+ usuários**, considerar escala horizontal (load balancer + múltiplas instâncias).

**5. Em que momento consideraríamos microserviços?**

📊 **Quando atingir 100.000+ usuários simultâneos** OU **quando times independentes precisarem deploy autônomo**. Para cenário atual (1.000 users), microserviços trariam **mais problemas que soluções**.

**6. Se há algum ponto do sistema atual que poderia virar gargalo?**

⚠️ **Notificações SSE** é o único módulo que pode precisar de separação futura (serviço dedicado para WebSockets). Todos os outros módulos escalam bem com monolito.

**7. Ou se não há necessidade alguma de microserviços no cenário atual?**

✅ **Correto. Não há necessidade.** Microserviços adicionariam:
- Complexidade operacional (10x mais difícil de debugar)
- Latência de rede (50-200ms por chamada entre serviços)
- Custo de infraestrutura (3-5x mais servidores)
- Lentidão no desenvolvimento (duplicação de código)

**Sem benefícios tangíveis** para escala atual.

---

## 🚀 Plano de Ação Recomendado

### Curto Prazo (1-2 semanas)

1. ✅ **Implementar cache em memória** (catálogo, configs)
2. ✅ **Adicionar índices compostos** (cancelamentos, pedidos ativos)
3. ✅ **Otimizar connection pool** (50 conexões)

**Benefício:** Reduz latência em **30-40%** sem reescrever código.

### Médio Prazo (1-3 meses)

1. ✅ **Implementar monitoramento** (Prometheus + Grafana)
2. ✅ **Load testing** (simular 5.000 usuários simultâneos)
3. ✅ **Documentar bottlenecks** (queries lentas, endpoints lentos)

**Benefício:** Visibilidade para decisões baseadas em dados.

### Longo Prazo (6-12 meses)

1. 🔄 **Escala horizontal** (se atingir 10.000+ usuários)
   - Load balancer (Nginx, Traefik)
   - 3-5 instâncias do backend
   - Redis para sessões compartilhadas

2. 🔄 **Separar notificações** (se atingir 50.000+ conexões SSE)
   - Serviço dedicado para WebSockets
   - Message queue (Redis Pub/Sub)

**Benefício:** Preparação para crescimento 10x sem reescrever sistema.

---

## 📚 Referências

1. **Node.js Performance Best Practices**  
   https://nodejs.org/en/docs/guides/simple-profiling

2. **MySQL Index Optimization**  
   https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html

3. **When to Use Microservices (Martin Fowler)**  
   https://martinfowler.com/articles/microservices.html

4. **The Majestic Monolith (DHH)**  
   https://m.signalvnoise.com/the-majestic-monolith/

5. **TiDB Performance Tuning**  
   https://docs.pingcap.com/tidb/stable/performance-tuning-overview

---

## 📞 Contato

Para dúvidas ou discussões sobre esta análise:
- **Email:** [seu-email]
- **Slack:** #engineering-architecture
- **Documento vivo:** Este documento deve ser atualizado conforme sistema evolui

---

**Última atualização:** 07 de Dezembro de 2025  
**Próxima revisão:** Quando atingir 5.000 usuários simultâneos
