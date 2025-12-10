
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

## 🎨 Atualizar Estilo de Loading

**Objetivo:**
- Substituir loading atual (fundo escuro + ícone azul) pelo estilo consistente
- Usar mesmo fundo e ícone verde da página "nenhuma ativação em andamento"
- Aplicar em todos os componentes de loading da aplicação

**Tarefas:**
- [x] Atualizar componente de loading para usar fundo escuro e ícone verde
- [x] Aplicar estilo consistente em todos os estados de loading
- [x] Testar visualmente em diferentes contextos


---

## 🎯 Reduzir Tamanho do Ícone de Loading

**Objetivo:**
- Diminuir o tamanho do ícone de loading em 20%
- Manter proporções e estilo visual consistente

**Tarefas:**
- [x] Localizar componente de loading atual
- [x] Reduzir tamanho do ícone em 20%
- [x] Testar visualmente a alteração
