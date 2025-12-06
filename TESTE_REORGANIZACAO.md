# Teste de Reorganização de Menus

## Problema Identificado
O DashboardLayout estava usando um array estático `menuItems` hardcoded, em vez de buscar os menus do banco de dados.

## Solução Implementada
1. Modificado `DashboardLayout.tsx` para buscar menus via `trpc.adminMenus.getAll.useQuery()`
2. Criado função `getIconComponent()` para converter nomes de ícones (string) em componentes Lucide
3. Atualizado script para popular ícones corretos no banco de dados
4. Mantido array `fallbackMenuItems` como fallback caso o banco esteja indisponível

## Ordem Atual dos Menus (do banco de dados)
1. Dashboard - /dashboard
2. Clientes - /clientes
3. Relatórios - /relatorios
4. Auditoria de Saldo - /auditoria
5. Configurações - /settings
6. Pagamentos - /payment-settings
7. APIs - /apis
8. Performance de APIs - /api-performance
9. Países - /countries
10. Catálogo - /catalogo
11. Afiliados - /affiliates

## Próximo Passo
Testar a reorganização através do modal "Reorganizar Menus" para confirmar que a ordem salva é aplicada corretamente.
