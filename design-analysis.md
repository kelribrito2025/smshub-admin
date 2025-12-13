# Análise do Design de Referência

## Elementos Identificados na Imagem

### 1. Abas de Navegação (Tabs)
- **Estilo**: Pills/rounded tabs com fundo escuro
- **Background**: Fundo escuro semitransparente (bg-neutral-900/50 ou similar)
- **Bordas**: Arredondadas (rounded-lg ou rounded-xl)
- **Tabs**:
  - "Receita & Lucro" (ativa - com fundo mais claro)
  - "Por País"
  - "Por Serviço"
  - "Transações"
- **Espaçamento**: Tabs agrupadas em container com padding interno

### 2. Card Principal
- **Background**: Fundo escuro (bg-neutral-900/50 ou bg-black/40)
- **Bordas**: Arredondadas, com borda sutil (border border-neutral-800)
- **Padding**: Generoso (p-6 ou p-8)
- **Título**: "Evolução de Receita e Lucro" (text-xl ou text-2xl, font-semibold)
- **Subtítulo**: "Análise temporal de desempenho financeiro" (text-sm, text-neutral-400)
- **Botão de Exportação**: No canto superior direito, com ícone de download e texto "Exportar CSV"

### 3. Gráfico de Área (Area Chart)
- **Tipo**: Gráfico de área empilhada (stacked area chart)
- **Cores**:
  - Receita: Azul/roxo (hsl(250, 60%, 60%) ou similar)
  - Lucro: Verde/turquesa (hsl(160, 50%, 50%) ou similar)
  - Custo: Rosa/vermelho (hsl(0, 60%, 60%) ou similar)
- **Grid**: Linhas horizontais pontilhadas (stroke-dasharray)
- **Eixos**: 
  - Y: Valores monetários (R$ 0,00 a R$ 100,00)
  - X: Datas (2025-12-07 a 2025-12-13)
- **Legenda**: Abaixo do gráfico com ícones de linha e labels coloridos

## Mudanças Necessárias

1. **Criar componente de Tabs estilizado** com visual moderno (pills/rounded)
2. **Atualizar card do gráfico** com:
   - Background escuro semitransparente
   - Bordas arredondadas e sutil
   - Header com título, subtítulo e botão de exportação alinhado à direita
3. **Implementar gráfico de área empilhada** usando Chart.js ou Recharts
4. **Adicionar funcionalidade de exportação CSV**
5. **Criar abas funcionais** para alternar entre diferentes visualizações
