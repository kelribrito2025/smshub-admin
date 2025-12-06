# SMS Hub Admin - TODO

## Infraestrutura e Configuração
- [x] Schema do banco de dados (clientes, campanhas, mensagens, vendas)
- [x] Configuração de autenticação e roles (admin/vendedor)
- [x] Sistema de notificações para o owner

## Dashboard e Visão Geral
- [x] Dashboard principal com métricas (SMS enviados, campanhas ativas, vendas)
- [x] Gráficos de performance e estatísticas
- [x] Painel de navegação lateral

## Gestão de Clientes
- [x] Listagem de clientes
- [x] Cadastro de novos clientes
- [ ] Edição e visualização de dados do cliente
- [ ] Histórico de campanhas por cliente

## Gestão de Campanhas SMS
- [x] Listagem de campanhas
- [x] Criação de nova campanha
- [ ] Agendamento de envio
- [ ] Status e relatórios de campanha
- [ ] Visualização de mensagens enviadas

## Gestão de Vendas
- [x] Registro de vendas
- [x] Histórico de transações
- [ ] Relatórios de vendas por período
- [ ] Comissões e métricas de vendedores

## Configurações
- [ ] Configurações gerais do sistema
- [ ] Gestão de usuários e permissões
- [ ] Templates de mensagens SMS

## Integração e Deploy
- [x] Sincronizar código com repositório GitHub

## Configuração de Credenciais
- [x] Verificar credenciais existentes nas chaves secretas
- [x] Configurar credenciais faltantes (Stripe)
- [x] Testar inicialização do servidor com todas as credenciais

## Limpeza do Banco de Dados
- [x] Remover tabelas do projeto inicial (sales, messages, campaigns, clients)

## Correções de Bugs
- [x] Criar procedure adminMenus.getAll no backend
- [x] Criar procedure stats.getDashboard no backend
- [x] Criar procedure settings.get no backend
