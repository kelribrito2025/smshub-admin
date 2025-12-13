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
