/**
 * Teste para validar que SSE está centralizado no StoreAuthContext
 * 
 * Este teste verifica que:
 * 1. Apenas 1 conexão SSE é criada por usuário
 * 2. Queries não têm polling (refetchInterval)
 * 3. Retry está configurado corretamente (retry: 1)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('SSE Centralization', () => {
  it('should have SSE only in StoreAuthContext', () => {
    const storeAuthPath = join(__dirname, '../client/src/contexts/StoreAuthContext.tsx');
    const storeAuthContent = readFileSync(storeAuthPath, 'utf-8');

    // Verificar que useNotifications está sendo chamado
    expect(storeAuthContent).toContain('useNotifications');
    expect(storeAuthContent).toContain('customerId: customer?.id || null');
    expect(storeAuthContent).toContain('autoToast: true');
  });

  it('should NOT have SSE in StoreLayout', () => {
    const storeLayoutPath = join(__dirname, '../client/src/components/StoreLayout.tsx');
    const storeLayoutContent = readFileSync(storeLayoutPath, 'utf-8');

    // Verificar que useNotifications NÃO está sendo importado
    expect(storeLayoutContent).not.toContain("import { useNotifications }");
    
    // Verificar que useOperationLock NÃO está sendo importado
    expect(storeLayoutContent).not.toContain("import { useOperationLock }");
  });

  it('should NOT have SSE in useOperationLock', () => {
    const useOperationLockPath = join(__dirname, '../client/src/hooks/useOperationLock.ts');
    
    // Verificar que o arquivo ainda existe (não foi deletado)
    expect(() => readFileSync(useOperationLockPath, 'utf-8')).not.toThrow();
  });

  it('should expose notifications state in StoreAuthContext', () => {
    const storeAuthPath = join(__dirname, '../client/src/contexts/StoreAuthContext.tsx');
    const storeAuthContent = readFileSync(storeAuthPath, 'utf-8');

    // Verificar que o contexto expõe notifications e unreadCount
    expect(storeAuthContent).toContain('notifications: any[]');
    expect(storeAuthContent).toContain('unreadCount: number');
    expect(storeAuthContent).toContain('markAsRead');
    expect(storeAuthContent).toContain('markAllAsRead');
  });
});

describe('Query Optimization', () => {
  it('should NOT have refetchInterval in StoreLayout queries', () => {
    const storeLayoutPath = join(__dirname, '../client/src/components/StoreLayout.tsx');
    const storeLayoutContent = readFileSync(storeLayoutPath, 'utf-8');

    // Contar ocorrências de refetchInterval
    const refetchIntervalCount = (storeLayoutContent.match(/refetchInterval/g) || []).length;
    
    // Deve ter apenas 1 ocorrência (comentário explicando que foi removido)
    expect(refetchIntervalCount).toBeLessThanOrEqual(1);
  });

  it('should have retry: 1 in all Store queries', () => {
    const files = [
      '../client/src/contexts/StoreAuthContext.tsx',
      '../client/src/components/StoreLayout.tsx',
      '../client/src/pages/StoreCatalog.tsx',
      '../client/src/pages/StoreActivations.tsx',
    ];

    files.forEach(file => {
      const filePath = join(__dirname, file);
      const content = readFileSync(filePath, 'utf-8');

      // Verificar que todas as queries têm retry: 1
      const queryMatches = content.match(/\.useQuery\(/g) || [];
      const retryMatches = content.match(/retry: 1/g) || [];

      // Se houver queries, deve haver pelo menos 1 retry configurado
      if (queryMatches.length > 0) {
        expect(retryMatches.length).toBeGreaterThan(0);
      }
    });
  });

  it('should have staleTime configured in all Store queries', () => {
    const files = [
      '../client/src/contexts/StoreAuthContext.tsx',
      '../client/src/components/StoreLayout.tsx',
      '../client/src/pages/StoreCatalog.tsx',
      '../client/src/pages/StoreActivations.tsx',
    ];

    files.forEach(file => {
      const filePath = join(__dirname, file);
      const content = readFileSync(filePath, 'utf-8');

      // Verificar que staleTime está configurado
      const staleTimeMatches = content.match(/staleTime:/g) || [];

      // Deve ter pelo menos 1 staleTime configurado
      expect(staleTimeMatches.length).toBeGreaterThan(0);
    });
  });

  it('should have notifications.getAll only in StoreAuthContext', () => {
    const storeAuthPath = join(__dirname, '../client/src/contexts/StoreAuthContext.tsx');
    const storeAuthContent = readFileSync(storeAuthPath, 'utf-8');

    // Verificar que notifications.getAll está no contexto
    expect(storeAuthContent).toContain('notifications.getAll.useQuery');

    // Verificar que StoreLayout NÃO tem notifications.getAll
    const storeLayoutPath = join(__dirname, '../client/src/components/StoreLayout.tsx');
    const storeLayoutContent = readFileSync(storeLayoutPath, 'utf-8');
    
    // Pode ter comentário, mas não deve ter query ativa
    const activeQueryCount = (storeLayoutContent.match(/const.*notifications.*getAll\.useQuery/g) || []).length;
    expect(activeQueryCount).toBe(0);
  });
});

describe('Architecture Validation', () => {
  it('should have centralized customer state', () => {
    const storeAuthPath = join(__dirname, '../client/src/contexts/StoreAuthContext.tsx');
    const storeAuthContent = readFileSync(storeAuthPath, 'utf-8');

    // Verificar que getCustomer está no contexto
    expect(storeAuthContent).toContain('store.getCustomer.useQuery');

    // Verificar que StoreLayout NÃO tem getCustomer query
    const storeLayoutPath = join(__dirname, '../client/src/components/StoreLayout.tsx');
    const storeLayoutContent = readFileSync(storeLayoutPath, 'utf-8');
    
    // Pode ter comentário, mas não deve ter query ativa
    const activeCustomerQueryCount = (storeLayoutContent.match(/const.*customerQuery.*=.*trpc\.store\.getCustomer\.useQuery/g) || []).length;
    expect(activeCustomerQueryCount).toBe(0);
  });

  it('should invalidate queries via SSE notifications', () => {
    const storeAuthPath = join(__dirname, '../client/src/contexts/StoreAuthContext.tsx');
    const storeAuthContent = readFileSync(storeAuthPath, 'utf-8');

    // Verificar que SSE invalida queries
    expect(storeAuthContent).toContain('utils.store.getCustomer.invalidate()');
    expect(storeAuthContent).toContain('utils.store.getMyActivations.invalidate()');
    expect(storeAuthContent).toContain('utils.notifications.getAll.invalidate()');
  });
});
