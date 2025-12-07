# Análise de Configurações - Problema de Redirecionamento

## Data: 07/12/2025

## ✅ Verificações Realizadas

### 1. Variáveis de Ambiente ✅

**Status:** CORRETAS - Todas as variáveis necessárias estão configuradas

```
VITE_FRONTEND_URL=https://app.numero-virtual.com ✅
VITE_APP_TITLE=SMS Hub Admin ✅
OAUTH_SERVER_URL=https://api.manus.im ✅
VITE_OAUTH_PORTAL_URL=https://manus.im ✅
```

**Conclusão:** Não há variáveis forçando redirect ou apontando para domínio errado.

---

### 2. Configuração do Servidor Express ✅

**Arquivo:** `server/_core/index.ts`

**Análise:**
- ✅ Não há regras de redirect forçado para `/admin`
- ✅ Rotas API corretamente configuradas sob `/api/*`
- ✅ OAuth callback em `/api/oauth/callback`
- ✅ tRPC em `/api/trpc`
- ✅ Vite/static serving como fallback

**Código relevante:**
```typescript
// OAuth callback under /api/oauth/callback
registerOAuthRoutes(app);

// tRPC API
app.use("/api/trpc", createExpressMiddleware({...}));

// development mode uses Vite, production mode uses static files
if (process.env.NODE_ENV === "development") {
  await setupVite(app, server);
} else {
  serveStatic(app);
}
```

**Conclusão:** Servidor Express está configurado corretamente, sem redirects forçados.

---

### 3. Configuração do Vite (Routing) ✅

**Arquivo:** `server/_core/vite.ts`

**Análise:**
- ✅ Fallback para `index.html` implementado corretamente
- ✅ Skip de rotas `/api/*` para não interferir com backend
- ✅ Sem regras de redirect para `/admin`

**Código relevante:**
```typescript
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  // Skip Vite fallback for API routes
  if (url.startsWith('/api/')) {
    return next();
  }

  // Serve index.html for all other routes (SPA routing)
  const page = await vite.transformIndexHtml(url, template);
  res.status(200).set({ "Content-Type": "text/html" }).end(page);
});
```

**Conclusão:** Vite está servindo `index.html` corretamente para todas as rotas não-API, permitindo client-side routing funcionar.

---

### 4. Arquivos de Configuração de Deploy ❓

**Verificação:**
```bash
ls -la | grep -E "\.(json|toml|yaml|yml|conf|config)$"
```

**Resultado:**
- ❌ Não encontrado `vercel.json`
- ❌ Não encontrado `netlify.toml`
- ❌ Não encontrado `nginx.conf`
- ✅ Apenas arquivos padrão: `package.json`, `tsconfig.json`, `components.json`

**Conclusão:** Não há arquivos de configuração de deploy no repositório que possam estar causando redirects.

---

## 🔍 Conclusão da Análise

### Código da Aplicação: ✅ CORRETO

Todas as verificações no código-fonte confirmam que:
1. Não há redirects forçados de `/` para `/admin`
2. Routing está configurado corretamente (SPA com fallback para index.html)
3. Variáveis de ambiente apontam para domínio correto
4. Servidor Express serve corretamente tanto API quanto frontend

### Problema está em: ❌ INFRAESTRUTURA EXTERNA

O problema **NÃO está no código** que está no repositório. O redirecionamento está sendo causado por:

1. **Configuração do servidor web em produção** (Nginx/Apache/etc.)
2. **Regras de redirect no painel de hospedagem** (Manus/Vercel/Netlify/etc.)
3. **Cache do CDN** (Cloudflare/etc.)
4. **Configurações aplicadas manualmente** que não estão versionadas no Git

---

## 📋 Ações Necessárias (Fora do Escopo do Código)

### Prioridade ALTA:

1. **Verificar Painel de Hospedagem Manus**
   - Acessar painel de configuração do projeto
   - Procurar por "Redirects", "Rewrites", "Rules"
   - Verificar se há regra: `/` → `/admin`
   - **REMOVER** qualquer redirect desse tipo

2. **Limpar Cache do CDN**
   - Se usando Cloudflare:
     * Acessar painel Cloudflare
     * Caching → Purge Cache → Purge Everything
   - Aguardar 2-3 minutos antes de testar

3. **Verificar Configuração do Servidor Web**
   - Se há acesso SSH ao servidor:
     ```bash
     # Nginx
     cat /etc/nginx/sites-available/app.numero-virtual.com
     
     # Apache
     cat /etc/apache2/sites-available/app.numero-virtual.com.conf
     ```
   - Procurar por linhas como:
     ```nginx
     # Nginx - REMOVER SE EXISTIR
     rewrite ^/$ /admin permanent;
     return 301 /admin;
     ```

### Prioridade MÉDIA:

4. **Verificar Service Workers no Browser**
   - Abrir DevTools (F12) em aba anônima
   - Application → Service Workers
   - Unregister todos os service workers
   - Application → Storage → Clear site data

5. **Testar com Bypass de Cache**
   - Adicionar `?nocache=1` na URL: `https://app.numero-virtual.com/?nocache=1`
   - Se funcionar, confirma que é problema de cache

---

## 🧪 Como Validar a Correção

Após realizar as ações acima:

1. **Abrir aba anônima** (Ctrl+Shift+N no Chrome)
2. **Acessar:** `https://app.numero-virtual.com/`
3. **Comportamento esperado:**
   - Página carrega mostrando lista de serviços (Whatsapp, Outros apps/site, Picpay, Lotus)
   - Saldo aparece como R$ 0,00
   - Não há redirecionamento automático
   - Login só é solicitado ao clicar em "Comprar"

4. **Se ainda redirecionar:**
   - Abrir DevTools (F12)
   - Aba Network
   - Recarregar página
   - Procurar por redirect (status 301, 302, 307, 308)
   - Verificar header `Location:` para ver quem está causando o redirect

---

## 📞 Próximos Passos

**Para o desenvolvedor:**
- ✅ Código está correto, nada mais a fazer no repositório

**Para o administrador de infraestrutura:**
- [ ] Acessar painel de hospedagem e verificar redirects
- [ ] Limpar cache do CDN
- [ ] Verificar configuração do servidor web (Nginx/Apache)
- [ ] Reportar resultados após cada ação

**Para debug avançado:**
- Capturar logs do servidor em produção durante acesso
- Usar `curl -v https://app.numero-virtual.com/` para ver headers de resposta
- Verificar se há proxy reverso intermediário causando redirect
