
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
