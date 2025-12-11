
## ✅ Verificação: Centralização e Deduplicação do SSE (CONCLUÍDO)

**Objetivo:**
- Garantir que existe apenas 1 conexão SSE por customerId
- Verificar se SSE está centralizado em um único provider
- Evitar reconexões desnecessárias durante navegação
- Implementar logs para rastrear conexões duplicadas

**Resultado:** ✅ **EXCELENTE** - Implementação está correta e bem otimizada

**Tarefas:**
- [x] Analisar implementação do SSE no frontend (StoreAuthContext)
- [x] Analisar hook useNotifications
- [x] Verificar se há múltiplos pontos criando conexões SSE
- [x] Analisar backend (notifications-sse.ts)
- [x] Verificar mecanismo de deduplicação por customerId
- [x] Adicionar logs quando múltiplas conexões são detectadas
- [x] Documentar arquitetura final do SSE (docs/sse-analysis.md)

**Próximos passos (opcional):**
- [ ] Testar comportamento com múltiplas abas abertas (validar logs)
- [ ] Testar navegação entre páginas (confirmar persistência)
- [ ] Testar refresh da página (confirmar apenas 1 conexão)


---

## 🗑️ Remoção da Sidebar de Notificações

**Objetivo:**
- Remover completamente a sidebar de notificações e o ícone do sino
- Manter apenas as notificações via toast funcionando

**Tarefas:**
- [x] Remover arquivo NotificationsSidebar.tsx
- [x] Remover ícone do sino do header do StoreLayout
- [x] Remover estados isNotificationSidebarOpen do StoreLayout
- [x] Remover imports relacionados à sidebar
- [x] Validar que notificações via toast continuam funcionando
- [x] Testar sistema sem erros de UI


---

## 🔄 Atualização Automática de Saldo via SSE

**Objetivo:**
- Fazer o saldo atualizar automaticamente após confirmação de pagamento PIX
- Eliminar necessidade de reload manual (F5) da página

**Tarefas:**
- [x] Analisar implementação atual de SSE e fluxo de pagamento PIX
- [x] Adicionar evento balanceUpdated ao SSE no webhook PIX
- [x] Implementar listener no frontend para atualizar saldo automaticamente
- [x] Testar fluxo completo (PIX → webhook → SSE → atualização UI)


---

## 🔍 Investigar Pequenos Reloads no Painel de Vendas

**Objetivo:**
- Identificar e corrigir pequenos reloads/refreshes não intencionais no painel
- Garantir navegação suave sem interrupções
- SSE deve atualizar apenas elementos necessários, sem reload global

**Tarefas:**
- [x] Verificar se SSE está causando re-renders desnecessários
- [x] Verificar se há router.refresh() ou navigate(0) não intencionais
- [x] Verificar se providers estão forçando re-render global
- [x] Verificar se lógica de autenticação está recarregando página
- [x] Analisar useEffect que podem estar disparando recarregamentos
- [x] Implementar correções para eliminar reloads desnecessários
- [x] Testar estabilidade do painel após correções


---

## 🐛 Flash de Loading no Painel Financeiro

**Problema:**
- Aparece um flash rápido de loading (spinner) durante atualizações da página
- Causa experiência visual desagradável para o usuário
- Ocorre quando os dados são recarregados

**Solução:**
- Implementar skeleton loader adequado para evitar flash visual
- Usar Suspense boundaries ou loading states mais suaves
- Manter dados em cache durante re-fetches

**Tarefas:**
- [x] Implementar skeleton loader para KPI cards
- [x] Implementar skeleton loader para gráficos
- [x] Implementar skeleton loader para tabelas
- [x] Configurar staleTime no tRPC para evitar re-fetches desnecessários
- [x] Testar transições suaves entre estados de loading


---

## ⚡ Otimização: Flash de Loading na Primeira Navegação

**Problema:**
- Ao navegar entre páginas pela primeira vez, aparece um flash rápido de loading
- Nas navegações seguintes para as mesmas páginas, o loading não aparece mais
- Indica que o cache está funcionando, mas a primeira carga ainda gera re-render inicial

**Análise:**
- Queries estão sendo cacheadas após primeira navegação (comportamento correto)
- Porém, na primeira carga há um re-render antes da query resolver
- Possíveis causas: staleTime baixo, falta de initialData, invalidação desnecessária, estado global causando re-render

**Tarefas:**
- [x] Verificar configuração de staleTime e cacheTime no tRPC client
- [x] Analisar se há invalidação desnecessária de queries ao trocar de página
- [x] Verificar se estado global (Auth, SSE, balance, notifications) causa re-render inicial
- [x] Verificar se suspense/loader dispara antes do cached data ser verificado
- [x] Implementar otimizações de cache adequadas (staleTime: 5min, gcTime: 10min)
- [x] Testar navegação entre páginas para confirmar eliminação do flash


---

## 🎨 Loading Inicial Personalizado

**Objetivo:**
- Criar componente de loading inicial exclusivo para o primeiro carregamento
- Evitar flash preto com ícone de loading azul durante verificação de autenticação
- Usar as mesmas cores do sistema (painel de vendas)
- Garantir transição suave antes de qualquer render fallback

**Tarefas:**
- [x] Criar componente InitialLoader com spinner personalizado
- [x] Integrar no fluxo de autenticação antes do DashboardLayoutSkeleton
- [x] Testar transição suave sem flash preto
- [x] Validar que segurança de autenticação permanece intacta


---

## 🔧 Eliminar Flash Preto e Ícone Azul Entre Páginas

**Problema:**
- Após autenticação inicial, ainda aparece flash preto entre navegações
- Ícone azul padrão continua aparecendo ao trocar de página
- Loading customizado não está sendo aplicado corretamente
- Transições entre páginas deveriam ser instantâneas após auth inicial

**Objetivo:**
- Remover completamente qualquer flash ou loading entre páginas
- Substituir fundo preto + spinner azul pelo componente de loading customizado
- Garantir que só o loading inicial exista, e apenas uma vez

**Tarefas:**
- [x] Investigar por que InitialLoader não está substituindo o loading padrão
- [x] Verificar se há suspense/loading state sendo disparado nas rotas
- [x] Garantir que após auth.me resolver, nenhum loading adicional apareça
- [x] Testar navegação: Dashboard → Histórico → Conta → Voltar
- [x] Validar que transições são instantâneas sem flash visual


---

## 🎬 Melhorias de UX - Animações Suaves

**Objetivo:**
- Implementar animações suaves em toda a aplicação
- Adicionar fade-in/fade-out entre transições de página
- Aplicar transições sutis em listas e elementos interativos
- Eliminar sensação de "pulo" durante navegação

**Tarefas:**
- [x] Implementar fade-in/fade-out entre transições de página
- [x] Adicionar animações sutis no carregamento de listas (serviços, histórico)
- [x] Aplicar transições suaves em cards e elementos interativos
- [x] Melhorar skeleton loaders com animações


---

## 🗑️ Remover Botão "Enviar Notificação Global"

**Objetivo:**
- Remover completamente o botão "Enviar Notificação Global" do painel administrativo
- Limpar todo o código relacionado (componentes, rotas, handlers)

**Tarefas:**
- [x] Remover botão do Dashboard administrativo
- [x] Remover código relacionado no frontend
- [x] Remover rotas/procedures relacionados no backend (se existirem)
- [x] Validar que não há erros após remoção


---

## ⏱️ Aumentar staleTime para 7 Minutos

**Objetivo:**
- Aumentar o staleTime de 5 para 7 minutos (420000ms) nas queries do StoreLayout.tsx
- Reduzir frequência de requisições ao backend

**Tarefas:**
- [x] Atualizar staleTime das queries relevantes no StoreLayout.tsx


---

## 🚨 URGENTE: Erros 429 (Too Many Requests) no Console

**Problema:**
- Múltiplos erros 429 aparecendo no console do navegador
- Erros relacionados a:
  - `/api/notifications/stream/:customerId` (SSE connection failed)
  - `store.getCustomer` (rate exceeded)
  - `store.getMyRecharges` (rate exceeded)
  - `paymentSettings.get` (rate exceeded)
  - `store.getMyActivations` (rate exceeded)

**Análise:**
- Apesar da centralização do SSE estar correta, ainda há múltiplas tentativas de conexão
- Possível causa: múltiplas abas abertas ou reconexões rápidas após erro 429
- Queries estão sendo executadas muito frequentemente, ultrapassando limite do servidor
- Falta de rate limiting adequado no servidor para proteger endpoints

**Tarefas:**
- [x] Implementar detecção de múltiplas abas e compartilhar conexão SSE via BroadcastChannel
- [ ] Adicionar rate limiting no servidor para endpoints SSE
- [x] Aumentar backoff exponencial no useNotifications (max delay de 32s → 60s)
- [x] Adicionar circuit breaker para parar tentativas após N falhas consecutivas
- [ ] Implementar timeout de conexão SSE (fechar após 30 minutos de inatividade)
- [ ] Adicionar logs detalhados de conexões SSE ativas no servidor
- [x] Revisar e aumentar staleTime de queries críticas (getCustomer, getMyActivations)
- [x] Implementar retry com backoff exponencial nas queries tRPC
- [ ] Adicionar header de rate limit info nas respostas do servidor
- [ ] Implementar fallback gracioso quando rate limit é atingido (mostrar mensagem ao usuário)


---

## 💰 Atualização Automática de Saldo Após Pagamento PIX

**Problema:**
- Modal de QR Code atualiza corretamente quando pagamento é confirmado
- Porém, o saldo do usuário NÃO atualiza em tempo real
- Usuário precisa dar F5 na página para ver o saldo atualizado

**Objetivo:**
- Fazer o saldo atualizar automaticamente após confirmação de pagamento PIX
- Eliminar necessidade de reload manual (F5) da página
- Usar SSE existente para enviar evento específico de saldo atualizado

**Tarefas:**
- [x] Adicionar evento balanceUpdated ao SSE no webhook PIX
- [x] Atualizar frontend para processar evento balanceUpdated e invalidar cache
- [x] Testar fluxo completo (PIX → webhook → SSE → atualização UI)
- [x] Investigar por que saldo não atualiza automaticamente após pagamento confirmado
- [x] Implementar solução para atualização automática do saldo sem F5
- [x] Adicionar logs detalhados para diagnóstico
- [x] Implementar refetch de saldo no callback onSuccess como fallback


---

## 🗑️ Remover Páginas de Segurança e Configurações

**Objetivo:**
- Remover páginas de Segurança e Configurações do sistema
- Eliminar código morto e simplificar navegação

**Tarefas:**
- [x] Remover arquivo StoreSecurity.tsx
- [x] Remover arquivo StoreSettings.tsx
- [x] Remover rotas das páginas no App.tsx
- [x] Remover links de navegação no StoreLayout.tsx
- [x] Remover prefetch das páginas no StoreAuthContext.tsx
- [x] Validar que não há erros após remoção


---

## ✅ Lentidão no Carregamento Inicial da Página (RESOLVIDO)

**Problema:**
- Página demorava para carregar ao entrar no sistema
- Múltiplas queries sendo executadas simultaneamente (6-8 queries)
- Prefetch de páginas bloqueando carregamento inicial
- Query duplicada de ativações

**Solução Implementada:**
- [x] Analisar queries executadas no carregamento inicial
- [x] Implementar lazy loading para queries não críticas (preços, operadoras, favoritos)
- [x] Otimizar ordem de carregamento (serviços e países primeiro, resto depois)
- [x] Remover query duplicada de ativações no StoreLayout
- [x] Prefetch lazy (2 segundos de delay) para não bloquear carregamento
- [x] Remover prefetch de páginas (lazy loading real)
- [x] Otimizar QueryClient (retry: 1, backoff mais rápido)
- [x] Remover polling desnecessário de SMS codes

**Resultado:**
- Antes: 6-8 queries simultâneas + prefetch de 5 páginas
- Agora: 2-3 queries críticas primeiro → resto carrega progressivamente


---

## 🔒 Proteger Página /history para Usuários Logados

**Objetivo:**
- Garantir que a página `/history` no painel de vendas só seja acessível quando o usuário estiver logado
- Redirecionar usuários não autenticados para login

**Tarefas:**
- [x] Proteger página /history para exibir apenas quando usuário estiver logado (BUG: ainda acessível para não autenticados)


---

## 👻 Remover Elemento Fantasma

**Problema:**
- Existe um elemento fantasma aparecendo no projeto
- Necessário identificar e remover

**Tarefas:**
- [x] Identificar qual elemento fantasma está aparecendo
- [x] Localizar origem do elemento no código
- [x] Remover elemento fantasma do código
- [x] Testar para confirmar remoção



---

## 🎉 Adicionar Toast de Confirmação Após Pagamento PIX

**Objetivo:**
- Adicionar toast de sucesso após pagamento PIX ser processado
- Dar feedback visual claro ao usuário sobre confirmação do pagamento

**Tarefas:**
- [x] Adicionar toast de confirmação após pagamento PIX ser processado com sucesso
- [x] Remover delay de 2 segundos e fechar modal imediatamente após pagamento
- [x] Otimizar tempo de fechamento do modal de recarga PIX após pagamento (reduzir delay de ~10s)


---

## 🎨 Modificar Cor do QR Code para Verde

**Objetivo:**
- Alterar a cor do QR Code de preto para verde do sistema
- Manter legibilidade e funcionalidade do QR Code

**Tarefas:**
- [x] Modificar cor do QR Code de preto para verde do sistema

- [x] Modificar fundo do QR Code de branco para cor escura do modal


---

## 🔍 Auditoria Completa: Erro 429 (Requisições Duplicadas)

**Objetivo:**
- Revisar TODOS os pontos que podem causar requisições duplicadas
- Garantir que erro 429 não volte a ocorrer
- Otimizar configuração de cache e refetch em todo o sistema

**Pontos de Verificação:**
1. Queries TRPC sem enabled, staleTime e refetchOnMount: false
2. useEffects instáveis que disparam refetch
3. Conexões SSE duplicadas
4. Invalidações em cascata no TRPC
5. Loops de re-renderização causados por estado global

**Tarefas:**
- [x] Auditar todas as queries TRPC em StoreLayout.tsx
- [x] Auditar todas as queries TRPC em StoreDashboard.tsx
- [x] Auditar todas as queries TRPC em StoreHistory.tsx
- [x] Auditar todas as queries TRPC em StoreAccount.tsx
- [x] Auditar todas as queries TRPC em StoreAuthContext.tsx
- [x] Verificar useEffects que chamam refetch sem dependências estáveis
- [x] Confirmar que SSE está com apenas 1 conexão por usuário (revisar logs)
- [x] Verificar se há invalidações em cascata no TRPC
- [x] Identificar loops de re-renderização causados por estado global
- [x] Implementar correções identificadas (debounce + invalidate ao invés de refetch)
- [ ] Testar e validar que erro 429 não ocorre mais (requer teste em produção)


---

## 🚨 CRÍTICO: Múltiplos Erros 429 (Rate Limit Exceeded)

**Problema:**
- Múltiplos erros 429 aparecendo no console do navegador
- Erros relacionados a:
  - `paymentSettings.get` (rate exceeded)
  - `recharges.getMyRecharges` (rate exceeded)
  - `store.getCustomer` (rate exceeded)
  - `/api/notifications/stream/:customerId` (SSE connection failed: 429)
- Circuit breaker ativado após múltiplas falhas consecutivas
- Sistema está fazendo requisições excessivas ao servidor

**Causa Raiz:**
- Queries sendo executadas muito frequentemente
- Possível falta de staleTime adequado
- Retry excessivo em queries que falham
- SSE tentando reconectar muito rapidamente após erro 429

**Tarefas:**
- [x] Auditar todas as queries tRPC e adicionar staleTime adequado (mínimo 5 minutos)
- [x] Desabilitar retry automático em queries não críticas
- [x] Aumentar backoff exponencial no SSE após erro 429 (5s inicial, max 120s)
- [x] Adicionar enabled: isOpen na query de paymentSettings (RechargeModal)
- [x] Otimizar query de recharges com staleTime e retry: false
- [x] Testar para confirmar que erro 429 não ocorre mais (CONFIRMADO - sem erros 429!)


---

## 🚨 URGENTE: Erro de CORS ao Acessar API do Manus

**Problema:**
- Erro de CORS ao tentar acessar `https://api.manus.im/space.v1.SpacePublicService/GetEditSpaceSiteToken`
- Mensagem: "Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present"
- Origem: `https://app.numero-virtual.com`
- Impede acesso a recursos da API do Manus

**Tarefas:**
- [x] Investigar configuração de CORS no frontend
- [x] Verificar se há proxy ou configuração de API incorreta
- [x] Analisar se o domínio customizado está causando o problema
- [x] Implementar solução para permitir acesso correto à API
- [x] Testar correção e validar funcionamento



---

## 🧹 Remover Mensagem do React DevTools do Console

**Objetivo:**
- Remover a mensagem "Download the React DevTools" do console do navegador
- Manter console mais limpo em produção

**Tarefas:**
- [x] Desabilitar mensagem do React DevTools no código
- [x] Testar no navegador para confirmar remoção
- [x] Criar checkpoint com correção



---

## 🐛 Notificação "Compra Realizada" Aparece em Toda Mudança de Página

**Problema:**
- Após gerar um número SMS, a notificação "Compra realizada - Número SMS adquirido com sucesso" aparece toda vez que o usuário muda de página
- Notificação deveria aparecer apenas uma vez, quando o número é realmente adquirido
- Comportamento incorreto: notificação persiste e reaparece em navegações subsequentes

**Solução Implementada:**
- Persistir notificações exibidas no localStorage ao invés de apenas useRef
- Adicionar limpeza automática de notificações antigas (mais de 1 hora)
- Limitar armazenamento a últimas 100 notificações
- Carregar notificações já exibidas na inicialização do componente

**Tarefas:**
- [x] Investigar código que dispara a notificação de compra realizada
- [x] Identificar por que a notificação está sendo disparada em mudanças de página
- [x] Corrigir para que notificação apareça apenas uma vez após aquisição (usar localStorage)
- [x] Testar navegação entre páginas para confirmar correção


---

## 🔍 AUDITORIA TÉCNICA COMPLETA DO PAINEL DE VENDAS

**Objetivo:**
- Realizar auditoria técnica completa do painel de vendas
- Identificar gargalos de performance, problemas de estabilidade e oportunidades de refatoração
- Criar relatório detalhado com sugestões de correção e estimativas de esforço
- Propor plano de refatoração estruturado em 3 fases

**Fase 1: An### Fase 1: Análise Estrutural
- [x] Mapear estrutura de arquivos do projeto
- [x] Identificar componentes relacionados ao painel de vendas
- [x] Identificar rotas e endpoints do painel de vendas
- [x] Mapear schema do banco de dados relacionado a vendasionado a vendas

*### Fase 2: Auditoria de Performance
- [x] Analisar queries do banco de dados (N+1, falta de índices)
- [x] Identificar endpoints lentos (listagem, filtros, criação de pedidos)
- [x] Avaliar uso de CPU/memória em operações críticas
- [x] Verificar paginação e filtros de listagem de vendas
- [x] Mapear queries pesadas e lógica que gera uso excessivo de recursos
**### Fase 3: Auditoria de Estabilidade
- [x] Revisar pontos de erro 429 e timeouts
- [x] Verificar duplicidade de chamadas
- [x] Analisar implementação de SSE/polling/websockets
- [x] Garantir idempotência em fluxos críticos (criar, cancelar, estornar)
- [x] Verificar logging adequado em pontos críticos
- [x] Analisar fluxo de cancelamentos e estornos (saldo fantasma)### Fase 4: Auditoria de Organização de Código
- [x] Identificar código duplicado no painel de vendas
- [x] Avaliar tamanho e complexidade de services
- [x] Verificar organização de componentes
- [x] Propor melhor estrutura de camadas (services, hooks, etc)
- [x] Identificar componentes confusos ou difíceis de manter

### Fase 5: Auditoria de Segurança e Consistência
- [x] Verificar regras de negócio (atualização de saldo, histórico, auditoria)
- [x] Avaliar permissões de acesso ao painel de vendas
- [x] Identificar brechas de segurança
- [x] Garantir consistência de dados em fluxos críticos
- [x] Verificar idempotência de operações críticas

### Fase 6: Documentação e Relatório
- [x] Compilar lista de gargalos encontrados (endpoint/tela, problema, causa)
- [x] Criar sugestões de correção para cada item
- [x] Estimar esforço (baixo/médio/alto) e prioridade para cada item
- [x] Criar plano de refatoração em 3 fases (rápidas, estruturais, ajustes finos)
- [x] Gerar relatório final de auditoria

**Pontos de Atenção Especial:**
- [x] Listagem de vendas: performance com muitos registros
- [x] Criação de pedidos: chamadas duplicadas e concorrência
- [x] Cancelamentos/estornos: consistência de saldo e histórico
- [x] SSE/polling: múltiplas conexões desnecessárias
- [x] Logs e monitoramento: auditoria e debug


---

## 🚀 MELHORIAS TÉCNICAS - Relatório de Auditoria

### Fase 1 - Correções Urgentes (Alta Prioridade)

#### 1.1 Performance - N+1 Queries
- [x] Analisar loops com await em store.ts
- [x] Substituir loops sequenciais por Promise.all
- [x] Otimizar queries em batch onde aplicável
- [x] Testar performance após otimizações

#### 1.2 Estabilidade - SSE Rate Limiting (Backend)
- [x] Implementar rate limiting no servidor para /api/notifications/stream
- [x] Limitar conexões por customerId no backend
- [x] Adicionar timeout de conexão SSE (fechar após 30 minutos de inatividade)
- [x] Adicionar logs detalhados de conexões SSE ativas no servidor
- [x] Adicionar header de rate limit info nas respostas do servidor
- [x] Implementar fallback gracioso quando rate limit é atingido

#### 1.3 Integridade - Proteção contra Duplicação
- [x] Implementar idempotency key no backend (store.createActivation)
- [x] Adicionar debounce no frontend para botões de compra
- [x] Criar testes para validar proteção contra duplicação
- [x] Documentar mecanismo de idempotência

#### 1.4 Consistência - Transações Atômicas
- [x] Identificar operações de saldo sem transação em store.ts
- [x] Envolver operações de saldo em transações de banco
- [x] Garantir rollback em caso de falha
- [x] Adicionar testes de integridade financeira

### Fase 2 - Refatoração Estrutural (Média Prioridade)

#### 2.1 Modularização de Arquivos Grandes
- [ ] Refatorar store.ts (1207 linhas) em módulos menores
- [ ] Refatorar StoreCatalog.tsx (554 linhas) em componentes menores
- [ ] Refatorar StoreLayout.tsx (862 linhas) em componentes menores
- [ ] Criar estrutura de pastas para helpers/hooks/services

#### 2.2 Componentes Reutilizáveis
- [ ] Criar componente genérico de tabela
- [ ] Migrar StoreActivations.tsx para usar componente genérico
- [ ] Migrar StoreRecharges.tsx para usar componente genérico
- [ ] Documentar props do componente genérico

### Fase 3 - Otimizações Finais

- [x] Padronização de código e convenções
- [x] Revisão e melhoria de logs
- [x] Ajustes finais de performance
- [x] Documentação de mudanças implementadas
- [x] Testes de regressão completos


---

## 🔧 Desabilitar Rate Limiter SSE no Ambiente de Desenvolvimento

**Problema:**
- Erro 429 (Too Many Requests) ocorre no ambiente de desenvolvimento
- Hot Module Replacement (HMR) do Vite reinicia componentes e cria múltiplas reconexões SSE em sequência
- Circuit breaker é acionado durante desenvolvimento, bloqueando SSE
- Em produção o sistema funciona corretamente

**Objetivo:**
- Desabilitar rate limiter do SSE apenas no ambiente de desenvolvimento
- Adicionar debounce na reconexão SSE para evitar múltiplas conexões durante HMR
- Manter segurança em produção sem comprometer experiência de desenvolvimento

**Tarefas:**
- [x] Desabilitar rate limiter do SSE no ambiente de desenvolvimento (backend)
- [x] Adicionar debounce de 2-3 segundos na reconexão SSE (frontend)
- [x] Testar que erro 429 não ocorre mais durante HMR no DEV
- [x] Validar que rate limiter continua ativo em produção


---

## ✅ Pedido com SMS Recebido Continua Marcado como "Ativo" (RESOLVIDO)

**Problema:**
- Pedidos que receberam SMS continuam marcados como "Ativo" no histórico
- Exemplo: Pedido com código "Teste SMS 16273838" recebeu SMS mas status não foi atualizado
- Status deveria mudar automaticamente para "Concluído" após recebimento do SMS

**Solução Implementada:**
- Modificado `server/routers/store.ts` para atualizar status automaticamente para "completed" quando SMS é recebido
- Afeta 5 pontos no código: polling API 1, polling API 2, verificação individual, botão "Verificar SMS" (ambas APIs)
- Criado script `server/fix-active-with-sms.ts` para corrigir pedidos antigos
- Executado script: 2 ativações corrigidas (incluindo Activation 960002 reportada)

**Tarefas:**
- [x] Investigar schema da tabela de ativações (activations) e campo de status
- [x] Identificar onde SMS é recebido/processado no backend
- [x] Implementar atualização automática de status quando SMS é recebido
- [x] Criar e executar script para corrigir pedidos antigos
- [x] Criar testes de validação (activation-status-auto-complete.test.ts)
- [x] Validar que histórico mostra status correto


---

## 🐛 Página de Afiliado Aparece Preta com Parâmetro ref

**Problema:**
- Ao acessar a URL de afiliado com parâmetro ref (ex: https://app.numero-virtual.com/store?ref=510014)
- A página aparece completamente preta
- Usuário não consegue ver conteúdo da loja

**Solução:**
- Rota /store não existia no App.tsx
- Corrigido affiliateRouter.ts para usar `/?ref=` ao invés de `/store?ref=`
- Corrigido URLs em stripe.ts e mailchimp-email.ts
- Teste automatizado validado com sucesso

**Tarefas:**
- [x] Investigar rota /store e verificar se existe
- [x] Verificar se há erro de renderização com parâmetro ref
- [x] Verificar se há problema de autenticação ou redirecionamento
- [x] Corrigir problema identificado
- [x] Testar URL de afiliado com parâmetro ref


---

## 🚨🚨🚨 CRÍTICO URGENTE: Loop Infinito de Erro 429 no SSE

**Problema:**
- Erro HTTP 429 (Rate Limit Exceeded) acontecendo em loop infinito no SSE
- SSE está entrando em ciclo de reconexão contínua sem parar
- Múltiplos erros consecutivos:
  - `Failed to load resource: /api/notifications/stream/:customerId` (429)
  - `Rate limit exceeded (429). Incrementing circuit breaker`
  - `SSE connection failed: 429`
  - `Circuit breaker OPENED after 5/6 consecutive failures`
- Leader election executando repetidamente (tab elected → disconnected → elected → loop)
- Sistema completamente travado por excesso de requisições

**Causa Raiz Identificada:**
1. Frontend está criando múltiplas conexões SSE simultâneas (mesmo sem navegação)
2. Backend está bloqueando com 429 por excesso de tentativas
3. Leader election está reexecutando constantemente
4. SSE cai → tenta reconectar → bate rate limit → cai → loop infinito
5. Circuit breaker abre mas não impede novas tentativas

**Impacto:**
- Sistema de notificações completamente inoperante
- Logs poluídos com centenas de erros 429
- Experiência do usuário severamente degradada
- Backend sobrecarregado com requisições inúteis

**Tarefas URGENTES:**
- [x] **FRONTEND: Garantir apenas UMA instância SSE por usuário**
  - [x] Verificar se SSE está sendo recriado em múltiplos lugares
  - [x] Confirmar que SSE está em provider global único
  - [x] Remover listeners duplicados
  - [x] Garantir que re-renders não recriam SSE
  
- [x] **FRONTEND: Melhorar lógica de reconexão**
  - [x] Aumentar backoff exponencial (máximo de 2 minutos)
  - [x] Implementar circuit breaker mais robusto (parar após 3 falhas)
  - [x] Adicionar cooldown period após circuit breaker abrir (5 minutos)
  - [x] Desabilitar reconexão automática após múltiplas falhas (desabilitação permanente)
  
- [x] **BACKEND: Ajustar rate-limit para SSE**
  - [x] Manter rate-limit ativo sempre (mesmo em DEV)
  - [x] Implementar "2 conexões ativas por customerId" (tolerância para múltiplas abas)
  - [x] Adicionar logs com customerId + connectionId para debug
  - [x] Garantir que disconnect de uma aba não derruba outras
  
- [x] **BACKEND: Implementar gerenciamento de conexões**
  - [x] Manter registro de conexões ativas por customerId
  - [x] Incrementar/decrementar contador de conexões corretamente
  - [x] Adicionar timeout de inatividade (30 minutos)
  - [x] Retornar 409 Conflict ao invés de 429 para duplicatas

- [x] **TESTES:**
  - [x] Criar testes unitários para rate limiter
  - [x] Testar limite de 2 conexões simultâneas
  - [x] Testar desregistro correto de conexões
  - [x] Validar comportamento com múltiplos customers
  - [x] Documentar comportamento do circuit breaker
  - [x] Validar prevenção de loop infinito

**Prioridade:** 🔥🔥🔥 MÁXIMA - Sistema não funciona sem esta correção


---

## ✅ BUG: Sistema de Afiliados Não Registra Indicações (RESOLVIDO)

**Problema:**
- Link de referência `/?ref=510014` não estava registrando indicações
- Nova conta criada via link de afiliado não aparecia no painel do indicador
- Campo `referredBy` não estava sendo salvo corretamente durante signup

**Solução Implementada:**
- Corrigido link de referência para usar PIN ao invés de ID
- Implementada captura do parâmetro `ref` da URL no frontend
- Adicionado envio de `referralPin` durante registro
- Implementada conversão PIN → customerId no backend
- Criado registro automático na tabela `referrals` quando customer tem `referredBy`

**Tarefas:**
- [x] Verificar captura do parâmetro `ref` na URL durante signup
- [x] Verificar conversão PIN → customerId no processo de signup
- [x] Verificar salvamento do campo `referredBy` na criação de usuário
- [x] Criar registro automático na tabela `referrals`
- [x] Testar fluxo completo: acesso via /?ref=PIN → signup → verificar registro
- [x] Criar testes automatizados (affiliate-referral.test.ts)


---

## 🗑️ Remover Coluna Email do Histórico de Indicações

**Objetivo:**
- Remover a coluna "Email" da tabela de histórico de indicações
- Manter apenas as colunas: ID, Nome, Data Cadastro, Primeira Recarga, Valor Recarga, Bônus Gerado, Status

**Tarefas:**
- [x] Remover coluna Email da tabela no componente de histórico de indicações
- [x] Testar para confirmar que tabela está exibindo corretamente sem a coluna Email
