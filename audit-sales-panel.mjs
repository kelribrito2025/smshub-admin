/**
 * Auditoria Técnica Completa do Painel de Vendas
 * 
 * Este script analisa:
 * 1. Performance & gargalos (queries, N+1, índices)
 * 2. Estabilidade & erros (429, timeouts, duplicidade)
 * 3. Organização do código (duplicação, complexidade)
 * 4. Segurança e consistência de dados
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const report = {
  performance: [],
  stability: [],
  codeOrganization: [],
  security: [],
  summary: {
    totalIssues: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0
  }
};

function addIssue(category, issue) {
  report[category].push(issue);
  report.summary.totalIssues++;
  
  if (issue.priority === 'alta') report.summary.highPriority++;
  else if (issue.priority === 'média') report.summary.mediumPriority++;
  else report.summary.lowPriority++;
}

// Função para analisar arquivos
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    return {
      path: filePath,
      content,
      lines,
      size: content.length,
      lineCount: lines.length
    };
  } catch (error) {
    return null;
  }
}

// Função para contar ocorrências de padrões
function countPattern(content, pattern) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

console.log('🔍 Iniciando auditoria técnica do painel de vendas...\n');

// ============================================
// 1. ANÁLISE DE PERFORMANCE
// ============================================
console.log('📊 Analisando performance e gargalos...');

// Analisar routers do backend (store.ts é o principal)
const storeRouter = analyzeFile(path.join(__dirname, 'server/routers/store.ts'));
if (storeRouter) {
  // Verificar queries sem paginação
  const hasListWithoutPagination = storeRouter.content.includes('getMyActivations') && 
                                   !storeRouter.content.includes('limit(');
  
  if (hasListWithoutPagination) {
    addIssue('performance', {
      endpoint: 'store.getMyActivations',
      problema: 'Listagem de ativações sem paginação adequada',
      causa: 'Query pode retornar muitos registros sem limite',
      solucao: 'Implementar paginação com limit/offset ou cursor-based pagination',
      esforco: 'médio',
      priority: 'alta'
    });
  }
  
  // Verificar N+1 queries (múltiplos awaits em loops)
  const hasLoopWithAwait = /for\s*\(.*\)\s*{[\s\S]*?await/g.test(storeRouter.content);
  if (hasLoopWithAwait) {
    addIssue('performance', {
      endpoint: 'store.ts (múltiplos endpoints)',
      problema: 'Possível problema N+1 em loops com await',
      causa: 'Queries sendo executadas sequencialmente em loops',
      solucao: 'Usar Promise.all() ou batch queries',
      esforco: 'médio',
      priority: 'alta'
    });
  }
}

// Analisar schema do banco de dados
const schema = analyzeFile(path.join(__dirname, 'drizzle/schema.ts'));
if (schema) {
  // Verificar índices nas tabelas críticas
  const activationsTable = schema.content.match(/export const activations[\s\S]*?\}\);/);
  const hasUserIdIndex = schema.content.includes('user_id_idx');
  const hasCreatedAtIndex = schema.content.includes('created_at_idx');
  
  if (!hasUserIdIndex || !hasCreatedAtIndex) {
    addIssue('performance', {
      endpoint: 'Banco de dados - tabela activations',
      problema: 'Falta de índices em colunas frequentemente consultadas',
      causa: 'Queries de listagem podem estar lentas sem índices adequados',
      solucao: 'Adicionar índices compostos para (userId, createdAt, status)',
      esforco: 'baixo',
      priority: 'alta'
    });
  }
}

// Analisar componentes frontend
const storeCatalog = analyzeFile(path.join(__dirname, 'client/src/pages/StoreCatalog.tsx'));
if (storeCatalog) {
  // Verificar se há muitas queries simultâneas
  const queryCount = countPattern(storeCatalog.content, /trpc\.\w+\.use(Query|Mutation)/g);
  
  if (queryCount > 5) {
    addIssue('performance', {
      endpoint: 'StoreCatalog.tsx',
      problema: `Muitas queries simultâneas (${queryCount} queries)`,
      causa: 'Múltiplas requisições ao carregar a página',
      solucao: 'Consolidar queries relacionadas ou implementar lazy loading',
      esforco: 'médio',
      priority: 'média'
    });
  }
}

// ============================================
// 2. ANÁLISE DE ESTABILIDADE
// ============================================
console.log('🔧 Analisando estabilidade e erros...');

// Verificar implementação de SSE
const sseFile = analyzeFile(path.join(__dirname, 'server/notifications-sse.ts'));
if (sseFile) {
  // Verificar rate limiting
  const hasRateLimit = sseFile.content.includes('rateLimit') || 
                       sseFile.content.includes('throttle');
  
  if (!hasRateLimit) {
    addIssue('stability', {
      endpoint: '/api/notifications/stream',
      problema: 'Falta de rate limiting no SSE',
      causa: 'Múltiplas conexões podem causar erro 429',
      solucao: 'Implementar rate limiting por customerId',
      esforco: 'médio',
      priority: 'alta'
    });
  }
  
  // Verificar timeout de conexão
  const hasTimeout = sseFile.content.includes('timeout') || 
                     sseFile.content.includes('setTimeout');
  
  if (!hasTimeout) {
    addIssue('stability', {
      endpoint: '/api/notifications/stream',
      problema: 'Falta de timeout em conexões SSE',
      causa: 'Conexões podem ficar abertas indefinidamente',
      solucao: 'Implementar timeout de 30 minutos de inatividade',
      esforco: 'baixo',
      priority: 'média'
    });
  }
}

// Verificar idempotência em operações críticas
if (storeRouter) {
  // Verificar se createActivation tem proteção contra duplicação
  const hasIdempotencyCheck = storeRouter.content.includes('externalOrderId') &&
                              storeRouter.content.includes('unique');
  
  if (!hasIdempotencyCheck) {
    addIssue('stability', {
      endpoint: 'store.createActivation',
      problema: 'Falta de proteção contra duplicação de pedidos',
      causa: 'Múltiplos cliques podem criar pedidos duplicados',
      solucao: 'Implementar idempotency key ou debounce no frontend',
      esforco: 'médio',
      priority: 'alta'
    });
  }
  
  // Verificar logging adequado
  const hasLogging = countPattern(storeRouter.content, /console\.(log|error|warn)/g);
  
  if (hasLogging < 5) {
    addIssue('stability', {
      endpoint: 'store.ts (todos os endpoints)',
      problema: 'Logging insuficiente em operações críticas',
      causa: 'Dificulta debug e auditoria',
      solucao: 'Adicionar logs estruturados em pontos críticos',
      esforco: 'baixo',
      priority: 'média'
    });
  }
}

// ============================================
// 3. ANÁLISE DE ORGANIZAÇÃO DE CÓDIGO
// ============================================
console.log('📁 Analisando organização do código...');

// Verificar tamanho dos arquivos
const filesToCheck = [
  'server/routers/store.ts',
  'client/src/pages/StoreCatalog.tsx',
  'client/src/pages/StoreActivations.tsx',
  'client/src/components/StoreLayout.tsx'
];

filesToCheck.forEach(filePath => {
  const file = analyzeFile(path.join(__dirname, filePath));
  if (file && file.lineCount > 500) {
    addIssue('codeOrganization', {
      endpoint: filePath,
      problema: `Arquivo muito grande (${file.lineCount} linhas)`,
      causa: 'Dificulta manutenção e compreensão',
      solucao: 'Refatorar em múltiplos arquivos menores e mais focados',
      esforco: 'alto',
      priority: 'média'
    });
  }
});

// Verificar duplicação de código
const storeActivations = analyzeFile(path.join(__dirname, 'client/src/pages/StoreActivations.tsx'));
const storeRecharges = analyzeFile(path.join(__dirname, 'client/src/pages/StoreRecharges.tsx'));

if (storeActivations && storeRecharges) {
  // Verificar se há padrões similares de tabela
  const hasTableInActivations = storeActivations.content.includes('<Table');
  const hasTableInRecharges = storeRecharges.content.includes('<Table');
  
  if (hasTableInActivations && hasTableInRecharges) {
    addIssue('codeOrganization', {
      endpoint: 'StoreActivations.tsx e StoreRecharges.tsx',
      problema: 'Possível duplicação de componentes de tabela',
      causa: 'Código similar em múltiplos arquivos',
      solucao: 'Criar componente reutilizável de tabela',
      esforco: 'médio',
      priority: 'baixa'
    });
  }
}

// ============================================
// 4. ANÁLISE DE SEGURANÇA E CONSISTÊNCIA
// ============================================
console.log('🔒 Analisando segurança e consistência...');

if (storeRouter) {
  // Verificar proteção de rotas
  const hasProtectedProcedure = storeRouter.content.includes('protectedProcedure');
  
  if (!hasProtectedProcedure) {
    addIssue('security', {
      endpoint: 'store.ts (todos os endpoints)',
      problema: 'Falta de proteção adequada em procedures',
      causa: 'Endpoints podem estar acessíveis sem autenticação',
      solucao: 'Garantir que todos os endpoints usem protectedProcedure',
      esforco: 'baixo',
      priority: 'alta'
    });
  }
  
  // Verificar validação de input
  const hasZodValidation = storeRouter.content.includes('z.object');
  
  if (!hasZodValidation) {
    addIssue('security', {
      endpoint: 'store.ts (inputs)',
      problema: 'Falta de validação de entrada com Zod',
      causa: 'Dados inválidos podem causar erros ou inconsistências',
      solucao: 'Adicionar schemas Zod para todos os inputs',
      esforco: 'médio',
      priority: 'alta'
    });
  }
  
  // Verificar transações para operações críticas
  const hasTransaction = storeRouter.content.includes('transaction') || 
                        storeRouter.content.includes('db.transaction');
  
  if (!hasTransaction) {
    addIssue('security', {
      endpoint: 'store.ts (operações de saldo)',
      problema: 'Falta de transações em operações críticas',
      causa: 'Risco de inconsistência de dados (saldo fantasma)',
      solucao: 'Usar transações para operações de saldo e cancelamento',
      esforco: 'médio',
      priority: 'alta'
    });
  }
}

// ============================================
// GERAR RELATÓRIO
// ============================================
console.log('\n✅ Auditoria concluída!\n');
console.log('📝 Gerando relatório...\n');

const reportContent = `
# 🔍 RELATÓRIO DE AUDITORIA TÉCNICA - PAINEL DE VENDAS
**Data:** ${new Date().toLocaleDateString('pt-BR')}
**Sistema:** SMS Hub Admin

---

## 📊 RESUMO EXECUTIVO

- **Total de Problemas Encontrados:** ${report.summary.totalIssues}
- **Prioridade Alta:** ${report.summary.highPriority}
- **Prioridade Média:** ${report.summary.mediumPriority}
- **Prioridade Baixa:** ${report.summary.lowPriority}

---

## 1️⃣ PERFORMANCE & GARGALOS

${report.performance.length === 0 ? '✅ Nenhum problema crítico encontrado.' : ''}
${report.performance.map((issue, i) => `
### ${i + 1}. ${issue.endpoint}

**Problema:** ${issue.problema}

**Causa Provável:** ${issue.causa}

**Sugestão de Correção:** ${issue.solucao}

**Esforço:** ${issue.esforco.toUpperCase()} | **Prioridade:** ${issue.priority.toUpperCase()}

---
`).join('\n')}

## 2️⃣ ESTABILIDADE & ERROS

${report.stability.length === 0 ? '✅ Nenhum problema crítico encontrado.' : ''}
${report.stability.map((issue, i) => `
### ${i + 1}. ${issue.endpoint}

**Problema:** ${issue.problema}

**Causa Provável:** ${issue.causa}

**Sugestão de Correção:** ${issue.solucao}

**Esforço:** ${issue.esforco.toUpperCase()} | **Prioridade:** ${issue.priority.toUpperCase()}

---
`).join('\n')}

## 3️⃣ ORGANIZAÇÃO DO CÓDIGO

${report.codeOrganization.length === 0 ? '✅ Nenhum problema crítico encontrado.' : ''}
${report.codeOrganization.map((issue, i) => `
### ${i + 1}. ${issue.endpoint}

**Problema:** ${issue.problema}

**Causa Provável:** ${issue.causa}

**Sugestão de Correção:** ${issue.solucao}

**Esforço:** ${issue.esforco.toUpperCase()} | **Prioridade:** ${issue.priority.toUpperCase()}

---
`).join('\n')}

## 4️⃣ SEGURANÇA E CONSISTÊNCIA DE DADOS

${report.security.length === 0 ? '✅ Nenhum problema crítico encontrado.' : ''}
${report.security.map((issue, i) => `
### ${i + 1}. ${issue.endpoint}

**Problema:** ${issue.problema}

**Causa Provável:** ${issue.causa}

**Sugestão de Correção:** ${issue.solucao}

**Esforço:** ${issue.esforco.toUpperCase()} | **Prioridade:** ${issue.priority.toUpperCase()}

---
`).join('\n')}

## 📋 PLANO DE REFATORAÇÃO

### 🚀 FASE 1: Correções Rápidas e de Alto Impacto (1-2 semanas)

${report.performance.filter(i => i.priority === 'alta' && i.esforco === 'baixo').map(i => `- ${i.endpoint}: ${i.problema}`).join('\n')}
${report.stability.filter(i => i.priority === 'alta' && i.esforco === 'baixo').map(i => `- ${i.endpoint}: ${i.problema}`).join('\n')}
${report.security.filter(i => i.priority === 'alta' && i.esforco === 'baixo').map(i => `- ${i.endpoint}: ${i.problema}`).join('\n')}

**Objetivo:** Resolver problemas críticos que podem ser corrigidos rapidamente.

---

### 🏗️ FASE 2: Refatorações Estruturais (3-4 semanas)

${report.performance.filter(i => i.esforco === 'médio' || i.esforco === 'alto').map(i => `- ${i.endpoint}: ${i.problema}`).join('\n')}
${report.stability.filter(i => i.esforco === 'médio' || i.esforco === 'alto').map(i => `- ${i.endpoint}: ${i.problema}`).join('\n')}
${report.codeOrganization.map(i => `- ${i.endpoint}: ${i.problema}`).join('\n')}

**Objetivo:** Melhorar arquitetura e organização do código.

---

### ✨ FASE 3: Ajustes Finos e Otimizações (1-2 semanas)

${report.performance.filter(i => i.priority === 'baixa' || i.priority === 'média').map(i => `- ${i.endpoint}: ${i.problema}`).join('\n')}
${report.stability.filter(i => i.priority === 'baixa' || i.priority === 'média').map(i => `- ${i.endpoint}: ${i.problema}`).join('\n')}

**Objetivo:** Polimento final e otimizações incrementais.

---

## 🎯 PRÓXIMOS PASSOS

1. **Revisar e validar** este relatório com a equipe
2. **Priorizar** itens da Fase 1 para início imediato
3. **Definir métricas** de sucesso para cada correção
4. **Agendar revisões** semanais de progresso
5. **Documentar** mudanças e decisões técnicas

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

- **Não fazer mudanças visuais** sem aprovação prévia
- **Validar regras de negócio** antes de alterar lógica
- **Testar em ambiente de staging** antes de produção
- **Manter backup** antes de refatorações grandes
- **Comunicar** mudanças que possam impactar usuários

---

**Relatório gerado automaticamente pela ferramenta de auditoria técnica.**
`;

fs.writeFileSync(path.join(__dirname, 'RELATORIO-AUDITORIA-VENDAS.md'), reportContent);

console.log('✅ Relatório salvo em: RELATORIO-AUDITORIA-VENDAS.md');
console.log(`\n📊 Resumo: ${report.summary.totalIssues} problemas encontrados`);
console.log(`   🔴 Alta prioridade: ${report.summary.highPriority}`);
console.log(`   🟡 Média prioridade: ${report.summary.mediumPriority}`);
console.log(`   🟢 Baixa prioridade: ${report.summary.lowPriority}`);
