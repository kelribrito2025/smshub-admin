# Debug: Redirecionamento Indesejado em Produção

## Problema
Quando acessando `app.numero-virtual.com` em aba anônima, o sistema redireciona para login do Manus quando deveria mostrar o painel de vendas público.

## Diagnóstico Realizado

✅ **Código da aplicação está CORRETO:**
- `StoreLayout.tsx` - Não exige autenticação obrigatória
- `StoreAuthContext.tsx` - Não força login automático
- `App.tsx` - Rotas `/`, `/history`, `/account`, etc. são públicas
- Testado em ambiente de desenvolvimento - **funciona perfeitamente sem autenticação**

❌ **Problema está na INFRAESTRUTURA/DEPLOY**

## Possíveis Causas e Soluções

### 1. Configuração do Servidor Web (Nginx/Apache)

**Verificar:**
```nginx
# Nginx - Verificar se há redirect forçado para /admin
location / {
    # NÃO deve ter:
    # return 301 /admin;
    # rewrite ^/$ /admin permanent;
}
```

**Solução:**
- Remover qualquer regra de redirect que force `/` → `/admin`
- Garantir que `/` serve o frontend normalmente

### 2. Vercel/Netlify/Plataforma de Deploy

**Verificar:**
- `vercel.json` ou `netlify.toml` - Regras de redirect
- Painel de configuração - Redirects/Rewrites

**Exemplo de configuração CORRETA (Vercel):**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Exemplo de configuração INCORRETA:**
```json
{
  "redirects": [
    { "source": "/", "destination": "/admin" }  // ❌ REMOVER ISSO
  ]
}
```

### 3. Cache do CDN (Cloudflare, etc.)

**Problema:**
Cache pode estar mantendo comportamento antigo mesmo após correção

**Solução:**
1. Acessar painel do Cloudflare (ou CDN usado)
2. Ir em "Caching" → "Purge Cache"
3. Selecionar "Purge Everything"
4. Aguardar 2-3 minutos
5. Testar novamente em aba anônima

### 4. Variáveis de Ambiente em Produção

**Verificar:**
- `VITE_FRONTEND_URL` - Deve ser `https://app.numero-virtual.com`
- Não deve haver variável forçando redirect

**Onde verificar:**
- Painel da plataforma de deploy (Vercel/Netlify/etc.)
- Arquivo `.env.production` (se existir)

### 5. Service Worker ou Cache do Browser

**Problema:**
Service worker antigo pode estar cacheando redirect

**Solução:**
1. Abrir DevTools (F12)
2. Application → Service Workers
3. Clicar em "Unregister" em todos os service workers
4. Application → Storage → "Clear site data"
5. Recarregar página (Ctrl+Shift+R)

## Checklist de Debug

- [ ] Verificar configuração do servidor web (Nginx/Apache)
- [ ] Verificar regras de redirect no painel de hospedagem
- [ ] Limpar cache do CDN (Cloudflare, etc.)
- [ ] Verificar variáveis de ambiente em produção
- [ ] Desregistrar service workers
- [ ] Testar em aba anônima após cada mudança

## Como Testar

1. **Aba Anônima/Privada:**
   ```
   Chrome: Ctrl+Shift+N
   Firefox: Ctrl+Shift+P
   ```

2. **Acessar:**
   ```
   https://app.numero-virtual.com/
   ```

3. **Comportamento Esperado:**
   - Página carrega mostrando lista de serviços
   - Saldo aparece como R$ 0,00
   - Não há redirecionamento para login
   - Login só é solicitado ao clicar em "Comprar" ou "Favoritar"

4. **Comportamento Incorreto (atual):**
   - Redireciona automaticamente para login do Manus

## Contato para Suporte

Se após verificar todos os itens acima o problema persistir, entre em contato com:
- Equipe de infraestrutura/DevOps
- Suporte da plataforma de hospedagem (Vercel/Netlify/etc.)
- Administrador do CDN (Cloudflare/etc.)

Forneça este documento e mencione que o código da aplicação está correto e funciona em desenvolvimento.
