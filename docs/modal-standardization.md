# Padronização Visual do Modal de Impersonação

## Objetivo
Padronizar o visual do modal de acesso à conta do cliente (impersonação) usando como referência o modal de "Confirmar Reembolso".

## Referência Visual
**Modal de Confirmar Reembolso:** `/admin/clientes` → clicar em uma transação → timeline de histórico do usuário → Confirmar Reembolso

## Mudanças Aplicadas

### 1. Layout Geral do Modal

**Antes:**
- Background: `bg-[#1a1a1a]`
- Border: `border-white/10`
- Backdrop: `bg-black/50`

**Depois:**
- Background: `bg-neutral-900`
- Border: `border-neutral-800`
- Backdrop: `bg-black/60`
- Shadow: `shadow-2xl`

### 2. Espaçamentos Internos

**Padronizado:**
- Padding principal: `p-6`
- Margin bottom do header: `mb-4`
- Margin bottom do content: `mb-6`
- Gap entre botões: `gap-3`

### 3. Ícone

**Antes:**
- Tamanho do container: `p-3` (indefinido)
- Border e background: `border` com cores variadas

**Depois:**
- Tamanho do container: `w-10 h-10`
- Background: `bg-{color}-500/20` (exemplo: `bg-orange-500/20`)
- Ícone: `size={20}`
- Sem border adicional

### 4. Tipografia

**Header:**
- Título: `text-lg font-medium text-white` (mudou de `font-semibold` para `font-medium`)
- Subtítulo (ID do Cliente): `text-xs text-neutral-500`

**Content:**
- Mensagem: `text-sm text-neutral-400`

### 5. Botão de Fechar (X)

**Padronizado:**
- Classes: `text-neutral-400 hover:text-white transition-colors`
- Tamanho do ícone: `size={20}`

### 6. Botões de Ação

**Antes:**
- Usava componente `Button` do shadcn/ui
- Estilo inconsistente

**Depois:**
- Botão Cancelar: `flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors text-sm font-medium`
- Botão Confirmar: `flex-1 px-4 py-2.5 bg-{color}-600 hover:bg-{color}-700 text-white rounded-lg transition-colors text-sm font-medium`
- Layout: `flex gap-3` (botões lado a lado com espaçamento de 3)

### 7. Bordas, Sombra e Radius

**Padronizado:**
- Border radius do modal: `rounded-xl`
- Border radius dos botões: `rounded-lg`
- Shadow do modal: `shadow-2xl`
- Border color: `border-neutral-800`

### 8. Cores e Estados

**Accent Colors (ícone e botão de confirmação):**
- Orange: `bg-orange-500/20` (ícone), `bg-blue-600 hover:bg-blue-700` (botão)
- Red: `bg-red-500/20` (ícone), `bg-red-600 hover:bg-red-700` (botão)
- Green: `bg-green-500/20` (ícone), `bg-green-600 hover:bg-green-700` (botão)
- Blue: `bg-blue-500/20` (ícone), `bg-blue-600 hover:bg-blue-700` (botão)

**Estados de Hover:**
- Botão X: `hover:text-white`
- Botão Cancelar: `hover:bg-neutral-700`
- Botão Confirmar: `hover:bg-{color}-700`

## Componentes Afetados

### Arquivo Principal
- `client/src/components/ConfirmationModal.tsx`

### Uso no Sistema
- Modal de Impersonação em `client/src/pages/Customers.tsx` (linha 887-898)

## Validação

Para validar a padronização:

1. Acesse `/admin/clientes`
2. Clique em um cliente para expandir detalhes
3. Clique em uma transação para ver histórico
4. Clique em "Confirmar Reembolso" → observe o visual
5. Feche o modal
6. Clique no botão de impersonação (ícone de usuário) → observe o visual
7. Compare: ambos devem ter o mesmo padrão visual

## Checklist de Padronização

- [x] Layout geral do modal
- [x] Espaçamentos internos (padding / margin)
- [x] Estilo e tamanho dos botões
- [x] Alinhamento dos botões
- [x] Tipografia (título, texto, hierarquia)
- [x] Bordas, sombra e radius
- [x] Cores e estados de hover/disabled
- [x] Tamanho e estilo do ícone
- [x] Botão de fechar (X)
- [x] Background e backdrop

## Resultado

O modal de impersonação agora segue exatamente o mesmo padrão visual do modal de confirmar reembolso, garantindo consistência visual em toda a aplicação.
