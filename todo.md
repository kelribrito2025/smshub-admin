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

## Ajuste de Altura dos Cards de Afiliados
- [x] Ajustar altura dos cards de estatísticas na página de afiliados para ficarem com a mesma altura dos cards da dashboard

## Ajuste de Altura dos Cards de Clientes
- [x] Ajustar altura dos cards de estatísticas na página /admin/clientes para ficarem com a mesma altura dos cards da dashboard

## Configuração de Tipografia
- [x] Configurar fonte San Francisco (sistema Apple) no DashboardLayout e em todo o projeto
- [x] Atualizar index.css com stack de fontes do sistema Apple (-apple-system, BlinkMacSystemFont, "SF Pro Display", etc.)

## Correção de Aplicação de Fonte nos Cards
- [x] Adicionar font-sans explicitamente em todos os cards customizados (bg-neutral-900/50) nas páginas Countries, Customers, Dashboard, PerformanceAPIs, Affiliates, Apis e Settings
- [x] Adicionar font-sans globalmente no componente Card do shadcn/ui para garantir aplicação consistente em todos os 59+ cards do projeto

## Auditoria Completa de Tipografia
- [x] Verificar tipografia em tabelas (Table, TableHeader, TableRow, TableCell)
- [x] Verificar tipografia em formulários e inputs (Input, Select, Textarea, Label)
- [x] Verificar tipografia em outros componentes shadcn/ui (Dialog, Popover, DropdownMenu, etc.)
- [x] Corrigir inconsistências encontradas

## Verificação de Fonte SF Pro no DashboardLayout
- [x] Verificar se a fonte SF Pro está sendo usada corretamente em dispositivos Apple
- [x] Ajustar font-family para incluir fallback correto da Apple se necessário

## Correção de Aplicação da Fonte SF Pro em Todo o Dashboard
- [x] Garantir que a fonte SF Pro Display/Text seja aplicada em 100% do DashboardLayout (sidebar, header, breadcrumbs, conteúdo)
- [x] Verificar e corrigir sobrescritas de font-family em componentes específicos
- [x] Testar aplicação da fonte em desktop e mobile

## Aplicação Consistente da SF Pro em 100% do DashboardLayout
- [x] Aplicar SF Pro de forma consistente em todo o DashboardLayout via herança CSS no container raiz
- [x] Garantir que sidebar, header, breadcrumbs, cards, tabelas e formulários herdem corretamente a fonte
- [x] Verificar que componentes shadcn/ui não sobrescrevem a fonte com fallbacks incorretos

## Comportamento do Header Durante Rolagem
- [x] Fixar header do DashboardLayout no topo durante rolagem da página (sticky position)

- [x] Ajustar header do painel admin para ficar fixo/sticky durante a rolagem da página
- [x] Corrigir comportamento sticky do header - aplicar solução robusta com position fixed

## Ajuste de Cor de Fundo na Página de Afiliados
- [x] Alterar cor de fundo do TabsList e Card principal para #101010 (via editor visual)

## Ajuste de Cor de Fundo na Página de Configurações
- [x] Alterar cor de fundo do card de preferência de layout para #0a0a0a (via editor visual)
- [x] Alterar cor de fundo dos cards de Métodos de Pagamento e Config do Programa de Afiliados para #0a0a0a (via editor visual)

## Ajuste de Cor de Fundo na Página de Clientes
- [x] Alterar cor de fundo das células da tabela de clientes para #151515 (via editor visual)
- [x] Alterar cor de fundo da seção expandida de transações para #101010 (via editor visual)

## Atualização Visual do Card de Saldo das APIs
- [x] Atualizar visual do card de Saldo das APIs com novo layout (bg-neutral-900/50, border neutral-800, cabeçalho com título e ícone, lista de saldos com labels e valores)

## Atualização Visual do Card de Total de Ativações
- [x] Atualizar visual do card "Total de Ativações" no dashboard administrativo com novo design (bg-neutral-900/50, bordas neutral-800, tipografia leve, ícone Activity)

## Atualização Visual do Card de Receita Total
- [x] Atualizar visual do card de Receita Total no dashboard admin com design moderno (bg-neutral-900/50, bordas neutral-800, tipografia leve, ícone TrendingUp)

## Ajuste de Layout da Página Admin Dashboard
- [x] Remover DashboardLayout da página /admin/dashboard
- [x] Ajustar altura dos cards de Total de Ativações e Receita Total para corresponder ao card de Saldo das APIs

## Ajuste de Altura do Card de Custo Total
- [x] Ajustar altura do card de Custo Total para corresponder à altura do card de Total de Ativações

## Ajuste de Altura dos Cards de Receita Total e Total de Reembolsos
- [x] Ajustar altura dos cards de "Receita Total" e "Total de Reembolsos" no dashboard admin para ficarem com a mesma altura

## Remoção do DashboardLayout da Página /admin/dashboard
- [x] Remover DashboardLayout da página /admin/dashboard e ajustar altura dos cards de receita e reembolsos para igualar ao card "Em breve"

## Ajuste de Altura dos Cards de Métricas no Dashboard Admin
- [x] Ajustar altura dos cards de Lucro Total, Total de Ativações e Custo Total para ficarem com a mesma altura do card de Taxa de Sucesso

## Ajuste de Altura dos Cards no Dashboard Admin (Total de Reembolsos, Em Breve, Saldo das APIs)
- [x] Ajustar altura dos cards "Total de Reembolsos", "Em Breve" e "Saldo das APIs Total" para ficarem com a mesma altura do card "Receita Total"

- [x] Corrigir sidebar desaparecida na página /admin/dashboard

## Ajuste de Cor do Botão "Adicionar Cliente"
- [x] Alterar cor de fundo do botão "Adicionar Cliente" para #1447e5 (via editor visual)

## Badge Contador de Novos Clientes
- [x] Badge contador de clientes cadastrados hoje no menu "Clientes"

## Ajuste do Campo Nome no Modal de Criação de Conta
- [x] Ajustar campo "Nome" no modal de criação de conta do StoreLayout
  - Mudar placeholder de "Seu nome completo" para "Primeiro nome"
  - Limitar a 14 caracteres (apenas letras)
  - Bloquear digitação acima do limite

## Campo de Busca por Número no Histórico
- [x] Adicionar campo de busca por número na página /history do StoreLayout (mesma linha horizontal do histórico de ativações)
- [x] Reduzir largura do campo de busca por número em 40%

- [x] Ajustar estilo das bordas do campo de busca para remover azul do foco e manter estilo verde

- [x] Remover bordas azuis remanescentes em todos os componentes do sistema
- [x] Corrigir borda azul do campo de busca por número na página /history do StoreLayout

- [x] Remover efeito ring do campo de busca por número na página History

- [x] Reformular visual do gráfico "Por País" para usar o mesmo estilo moderno do gráfico de "Receita & Lucro"

- [x] Reformular visual do gráfico "Por Serviço" para usar o mesmo estilo moderno do gráfico de "Receita & Lucro"

- [x] Alterar cor do ícone no card "Total de Reembolsos" para #cd9700

- [x] Corrigir inconsistência de fonte na página /affiliate (títulos e descrições devem usar mesma fonte do título principal)

- [x] Aplicar mesma fonte do título "Programa de Afiliados" em todos os cards da página /affiliate
- [x] Remover font-sans da página /affiliate para herdar font-mono do StoreLayout

- [x] Corrigir fonte Geist em todos os elementos do StoryLayout na página /affiliate (atualmente apenas título e descrição estão corretos, mas os cards de histórias ainda usam fonte sans)

- [x] Aplicar fonte Geist (font-mono) e story layout na página /account

- [x] Ajustar cabeçalho da página /account para ficar compacto como o da página /affiliate (reduzir tamanhos de fonte e espaçamentos)

- [x] Corrigir capitalização dos textos na página /account (usar apenas primeira letra maiúscula ao invés de tudo em uppercase)

- [x] Verificar e corrigir fonte dos campos de valores (Pin de cliente, Nome completo, Email, CPF/CNPJ, CEP, Estado, Cidade, Bairro, Rua/Avenida, Número) na página /account para usar font-mono (Geist)

- [x] Ajustar StoreLayout para exibir conteúdo institucional quando usuário não estiver logado (lista vertical simples com setas, sem accordion ou animações)
- [x] Atualizar cabeçalho da página de ativações para "Números virtuais para verificação de contas" e descrição institucional

- [x] Remover título e descrição repetidos na seção de funcionalidades da Home, manter apenas lista simples com setas

- [x] Remover completamente o Card/container da lista institucional, deixar apenas <ul> solta no fluxo da página (sem borda, fundo, padding)

- [x] Corrigir Home para mostrar conteúdo de marketing apenas para usuários deslogados

- [x] Ajustar espaçamento vertical entre descrição e lista de recursos na Home

- [x] Adicionar 4 novos itens à lista existente na StoreCatalog.tsx (seta + texto)

- [x] Adicionar banner cyber call-to-action abaixo da seção de benefícios na página inicial

- [x] Substituir seção "Quer utilizar nossos serviços?" no StoreLayout pelo novo visual com tema tech/hacker

- [x] Substituir completamente a seção "Nossos Serviços" pelo novo código fornecido

- [x] Ajustar padding superior do HeroSection para 0px (via editor visual)
- [x] Ajustar padding superior e inferior do main do StoreLayout (via editor visual)

- [x] Ajustar texto do Hero Section (singular "Número virtual para" e nova descrição sobre privacidade e segurança)
- [x] Ajustar dimensões do Hero Section via editor visual

- [x] Adicionar botão de Login vazado (outline) à esquerda do botão "Criar conta" na página inicial

## Efeito de Digitação Animado no Hero
- [x] Implementar efeito de digitação (typing effect) no texto verde "verificação de contas" do Hero Section
- [x] Alternar entre três frases: "verificação de contas", "receber SMS online" e "privacidade e segurança"
- [x] Configurar timing: digitação 100ms/letra, pausa 2s ao completar, apagar 50ms/letra
- [x] Adicionar cursor piscante (|) ao final do texto
- [x] Criar loop contínuo entre as três frases

## Bug: Efeito de Digitação Para Prematuramente
- [x] Investigar por que o efeito de digitação no Hero Section começa a escrever e depois para
- [x] Identificar causa raiz (array phrases nas dependências do useEffect causava loop infinito)
- [x] Corrigir lógica do efeito de digitação (removido phrases das dependências)
- [x] Testar correção no navegador

## Integração dos Botões do Hero Section com Modais de Autenticação
- [x] Analisar estrutura dos modais de login e criação de conta no StoreLayout
- [x] Conectar botão "Login" do Hero Section ao modal de autenticação
- [x] Conectar botão "Criar conta" do Hero Section ao modal de criação de conta
- [x] Testar abertura dos modais ao clicar nos botões

## Aplicação de Background Cyber/Matrix no StoreLayout
- [x] Aplicar background cyber/Matrix no StoreLayout (gradiente escuro, grid verde, scan line, glows)

- [x] Remover linha horizontal animada da seção HeroSection

- [x] Remover linha horizontal animada (scanner) quando usuário estiver logado

- [x] Corrigir barra de rolagem verde indesejada na página StoreLayout quando usuário está deslogado

## Página Pagamentos (/admin/pagamentos)

### Cards de Resumo
- [x] Card: Total de pagamentos recebidos (R$)
- [x] Card: Total de devoluções via Pix (R$)
- [x] Card: Em breve (placeholder)

### Tabela de Pagamentos
- [x] Criar schema de pagamentos no banco
- [x] Criar procedures tRPC para listar pagamentos
- [x] Implementar tabela com colunas: ID, ID Gerencianet, Cliente (nome + PIN), Tipo, Origem, Descrição, Valor, Data/Hora
- [x] Aplicar mesmo estilo visual da tabela de /admin/auditoria

### Filtros de Busca
- [x] Filtro de busca por texto (PIN, nome, e-mail)
- [x] Filtro por intervalo de datas (data inicial/final)

### Funcionalidade de Devolução
- [x] Estrutura para abrir modal/drawer de confirmação
- [x] Opção: devolução integral ou parcial
- [x] Input para valor (se parcial)
- [x] Integração com API de devolução (Gerencianet PIX)
- [x] Atualizar lista e cards após devolução
- [x] Testes unitários do router de pagamentos

### Integração
- [x] Adicionar rota /admin/pagamentos no App.tsx
- [x] Adicionar item "Pagamentos" no menu do DashboardLayout

- [x] Corrigir cor de fundo dos cards da dashboard para #0a0a0a (consistência visual)

- [x] Revisar e corrigir bg-neutral-900/50 para #0a0a0a em todas as páginas admin do DashboardLayout

## Ajuste de Cor de Fundo na Página de Catálogo
- [x] Alterar cor de fundo dos cards de filtros, estatísticas e tabela principal para #0a0a0a (via editor visual)

- [x] Integrar filtros de busca no card da lista de pagamentos (remover container separado)

- [x] Ajustar layout dos filtros na página de pagamentos (mesma linha do título, buscar 50%, data inicial 15%, data final 15%, alinhados à direita)

- [x] Implementar paginação na página /admin/pagamentos (máximo 30 registros por página)

- [x] Ajustar espaçamento do cabeçalho da página /admin/pagamentos para corresponder ao layout da /admin/dashboard
- [x] Adicionar ícone de cartão no título "Pagamentos"

- [x] Alterar cor do ícone de Pagamentos para azul (mesma cor do admin)

## Correções da Funcionalidade de Devolução PIX
- [x] Adicionar campo endToEndId na tabela recharges no schema
- [x] Modificar webhook PIX para armazenar endToEndId quando pagamento for confirmado
- [x] Corrigir busca do endToEndId no router de payments (buscar de recharges ao invés de pixTransactions)
- [x] Adicionar validações para garantir que só pagamentos PIX com endToEndId possam ser devolvidos
- [x] Testar fluxo completo de devolução PIX

- [x] Limpar dados mock da página /admin/pagamentos mantendo estrutura UI

## Bugs

- [x] Investigar e corrigir erro "PIX: endToEndId não encontrado" ao processar devoluções (pagamento #600001, cliente João PIN: 1273)

- [x] Corrigir erro de estrutura HTML na página de pagamentos (div aninhado dentro de tr)

- [x] Adicionar coluna "Status" na tabela de pagamentos
- [x] Implementar dropdown com observações de devolução ao clicar em pagamentos devolvidos

- [x] Não exibir botão de devolução em pagamentos já devolvidos

- [x] Corrigir erro de chave única do React na tabela de pagamentos (Fragment precisa de key)

## Débito Automático em Devoluções Pix

- [x] Implementar lógica de débito automático de saldo no backend durante devoluções
- [x] Adicionar cálculo de valor_debito = MIN(valor_devolucao, saldo_disponivel)
- [x] Garantir que débito e devolução sejam atômicos (mesma transação)
- [x] Reformular modal de devolução com informações de saldo atual e após devolução
- [x] Adicionar validação para nunca permitir saldo negativo
- [x] Atualizar procedimento de devolução para executar débito antes da devolução Pix
- [x] Criar testes para validar a lógica de débito automático

- [x] Corrigir modal duplicado/incompleto de devolução na página /admin/pagamentos

- [x] Reorganizar menu dropdown do admin no DashboardLayout para incluir 3 opções: Configurações, Reorganizar Menus e Sign out

- [x] Adicionar opção ⚙️ Configurações no menu dropdown do perfil admin (navega para /admin/settings)

- [x] Adicionar menu de Configurações na TopNavLayout do perfil admin

- [x] Remover opção "Configurações" duplicada do menu dropdown do perfil no TopNavLayout (já existe no menu "Mais")

- [x] Remover item "Configurações" do dropdown "Mais" na barra de navegação superior (TopNavLayout) - manter apenas no dropdown do perfil

- [x] Remover item "Configurações" do dropdown "Mais" no DashboardLayout (removido do fallbackMenuItems e da tabela admin_menus)

## Atualização Visual do Modal de Processar Devolução
- [x] Aplicar novo visual do modal de Processar Devolução na página /admin/pagamentos conforme especificado
- [x] Alterar cor do card "Saldo Atual" de azul para verde (emerald) no modal de Processar Devolução

- [x] Ajustar transparência do hover no gráfico de Receita por País para 90%

- [x] Ajustar transparência do hover no gráfico de Receita por País para 100% (totalmente transparente)
- [x] Ajustar transparência do hover no gráfico de Receita por Serviço para 100% (totalmente transparente)

- [x] Atualizar visual do card "Países Mais Utilizados" no dashboard admin

- [x] BUG: Erro "Failed to fetch dynamically imported module: StoreAccount" - importação incorreta de copyToClipboard de '../lib/clipboard' ao invés de '../lib/utils'

- [x] BUG: Corrigir erros tRPC na página /admin - API retorna HTML em vez de JSON (verificado: servidor funcionando corretamente, erro foi temporário)

- [x] Corrigir espaçamento dos cabeçalhos nas páginas quando usuário está logado (Home, History, Recharges, Account)

- [x] Aplicar efeito AnimatedPage nas páginas do StoreLayout quando utilizador estiver logado (StoreCatalog, StoreRecharges, StoreAccount, StoreAffiliate)


## Nova Aba "Pagamentos" na Seção de Evolução de Receita e Lucro
- [x] Criar nova aba "Pagamentos" no card de Evolução de Receita e Lucro do DashboardLayout admin
- [x] Mostrar os 25 últimos pagamentos na aba
- [x] Implementar tabela com colunas: ID, Cliente, Tipo, Origem, Valor, Data e Hora
- [x] Aplicar mesmo estilo visual da tabela da página /admin/pagamentos

- [x] Corrigir tabela "Últimos Pagamentos" para ocupar 100% da largura disponível (remover espaço vazio à direita da coluna Data/Hora)

- [x] Corrigir espaço vazio após coluna Data/Hora na tabela de Últimos Pagamentos (tabela não ocupa 100% da largura) - REVISÃO

- [x] Ajustar distribuição de largura das colunas na tabela de Últimos Pagamentos (ID mais compacto, Cliente reduzido, Data/Hora mais largo, Valor alinhado)

- [x] Renomear "Transações" para "Pedidos" no menu admin do DashboardLayout
- [x] Reorganizar colunas da tabela de transações: ID - Data - País - Serviço - Telefone - Status - Custo - Receita - Lucro

- [x] Remover bordas redondas do status na tabela de pedidos (Dashboard e Financial) - deixar apenas texto colorido

- [x] Traduzir textos de status para português (completed → Concluído, cancelled → Cancelado, etc.)

- [x] Adicionar ícone de exclusão na coluna de ações da página /admin/catalogo
- [x] Criar modal de confirmação para exclusão de serviço do catálogo
- [x] Implementar lógica de exclusão do serviço do catálogo
