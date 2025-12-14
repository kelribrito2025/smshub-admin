# Alterações no Header Sticky do DashboardLayout

## Problema Identificado

O header do painel admin não ficava fixo durante a rolagem da página, desaparecendo quando o usuário rolava para baixo.

## Causa Raiz

O `position: sticky` requer condições específicas para funcionar corretamente:

1. O elemento pai deve ter um contexto de scroll definido (`overflow: auto` ou `scroll`)
2. O elemento pai deve ter uma altura definida
3. Não pode haver conflitos de `overflow: hidden` em containers intermediários
4. O scroll deve acontecer no container correto

## Solução Implementada

### 1. Ajustes no `SidebarInset` (client/src/components/ui/sidebar.tsx)

**Alteração 1:** Adicionado `overflow-y-auto` para criar contexto de scroll
```tsx
className={cn(
  "bg-background relative flex w-full flex-1 flex-col overflow-y-auto",
  // ...
)}
```

**Alteração 2:** Removido `h-screen` que causava conflito com `h-svh` do wrapper pai
- Deixar a altura ser herdada naturalmente do container pai garante que o scroll aconteça no lugar correto

### 2. Ajustes no `SidebarProvider` wrapper (client/src/components/ui/sidebar.tsx)

**Alteração:** Mudado de `min-h-svh` para `h-svh` para garantir altura fixa
```tsx
className={cn(
  "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex h-svh w-full",
  // ...
)}
```

### 3. Ajustes no Header (client/src/components/DashboardLayout.tsx)

**Mantido:** `position: sticky` com `top-0` e `z-50`
```tsx
<div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-50">
```

**Alteração no main:** Removido `flex-1` e adicionado `flex-shrink-0` para evitar conflitos de layout
```tsx
<main className="p-4 flex-shrink-0">
```

## Resultado Esperado

✅ O header agora deve ficar fixo no topo durante a rolagem
✅ Funciona em todas as páginas do admin
✅ Funciona em desktop e mobile
✅ Não altera o layout visual
✅ Não cria duplicação de header
✅ Z-index alto (50) garante que fica acima de outros elementos

## Como Testar

1. Acesse o painel admin: `https://3000-iv9p9xsb0d4d1e8v81hxj-a76198b8.manusvm.computer/admin/dashboard`
2. Role a página para baixo
3. Verifique que o header com o título da página (ex: "Dashboard") e o botão "Painel de vendas" permanece visível no topo
4. Navegue para outras páginas (Países, APIs, Clientes, etc.) e teste o comportamento em cada uma
5. Teste em diferentes resoluções (desktop, tablet, mobile)

## Arquivos Modificados

- `client/src/components/ui/sidebar.tsx` - Ajustes no SidebarInset e SidebarProvider
- `client/src/components/DashboardLayout.tsx` - Ajustes no header e main
- `todo.md` - Marcação de tarefas concluídas

## Notas Técnicas

- A solução usa `position: sticky` ao invés de `position: fixed` para manter a simplicidade e evitar cálculos complexos de largura da sidebar
- O `overflow-y-auto` no `SidebarInset` cria o contexto de scroll necessário para o sticky funcionar
- O `h-svh` no wrapper garante que a altura seja baseada na viewport, permitindo scroll interno
- O `z-index: 50` garante que o header fique acima de banners e outros elementos fixos
