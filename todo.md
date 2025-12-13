# Project TODO

## Layout Flexível (Sidebar existente + Nova Topbar Superior)
- [x] Atualizar schema do banco de dados para armazenar preferência de layout do usuário (sidebar ou top)
- [x] Criar procedures tRPC para salvar e recuperar preferências de layout
- [x] Implementar componente TopNavLayout para navegação superior (horizontal)
- [x] Atualizar DashboardLayout para alternar entre sidebar existente e nova topbar
- [x] Criar página /admin/settings com toggle para escolher entre barra lateral e barra superior
- [x] Testar alternância entre layouts e persistência da preferência no banco de dados

## Correção de Ícones
- [x] Corrigir ícones da barra superior para corresponder aos ícones da barra lateral

## Ajustes de Texto
- [x] Alterar título do header de "Número Virtual" para "Painel admin"

- [x] Corrigir textos do menu dropdown do admin (mostrar "Reorganizar Menus" e "Sign out" ao invés de botões genéricos)

## Atualização Visual do Dashboard
- [x] Atualizar visual do card de custo total no dashboard
- [x] Atualizar card de Taxa de Sucesso com novo visual (bg-neutral-900/50, bordas, ícone Activity)

## Ajuste de Altura dos Cards
- [x] Ajustar altura dos cards "Em breve" para ficarem com a mesma altura dos cards "Taxa de Sucesso" e "Custo Total"

## Funcionalidade de Drag and Drop nos Cards
- [x] Adicionar drag and drop nos 8 cards da dashboard para reordenação livre com persistência

## Melhorias no Drag and Drop
- [x] Adicionar feedback visual profissional ao drag and drop (efeito ghost, placeholder, destaque no card ativo)

## Card de Total de Reembolsos
- [x] Analisar estrutura de reembolsos no schema e routers
- [x] Criar procedure para calcular reembolsos do dia (admin apenas)
- [x] Criar procedure para calcular reembolsos por período (filtro)
- [x] Atualizar card "Em breve" com dados de reembolsos
- [x] Garantir que métrica secundária reage ao filtro de período

## Atualização de Estilo Visual - Gráfico e Abas
- [x] Atualizar estilo visual do card "Evolução de Receita e Lucro" conforme design de referência
- [x] Atualizar estilo das abas de navegação (Receita & Lucro, Por País, Por Serviço, Transações)

## Ajuste de Altura dos Cards de Países
- [x] Ajustar altura dos cards de estatísticas na página de países para ficarem com mesma altura dos cards da dashboard
- [x] Ajustar cor de fundo do card "Lista de Países" para #101010 (via editor visual)

## Ajustes de Texto no Catálogo
- [x] Alterar texto do botão "Adicionar Serviço" para "Novo Serviço"
- [x] Alterar texto do botão "Sincronizar Catálogo" para "Sincronizar serviços"

## Ajuste de Cor no Card de Países Inativos
- [x] Alterar cor do número de países inativos para #fb2b37 (vermelho)

## Ajuste de Cor de Fundo na Página de APIs
- [x] Alterar cor de fundo do card de taxa de câmbio para #0a0a0a
- [x] Alterar cor de fundo do card de informações de APIs para #0a0a0a
