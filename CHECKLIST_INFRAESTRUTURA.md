# Checklist de Ações - Infraestrutura

## Problema
`app.numero-virtual.com` redireciona para login do Manus em aba anônima quando deveria mostrar painel de vendas público.

## ✅ Confirmado: Código está CORRETO
O problema está na infraestrutura/deploy, não no código da aplicação.

---

## 📋 Checklist de Ações (Executar em Ordem)

### ⚠️ ANTES DE COMEÇAR
- [ ] Fazer backup das configurações atuais
- [ ] Documentar qualquer mudança realizada
- [ ] Testar em aba anônima após cada ação

---

### 🔴 AÇÃO 1: Verificar Painel de Hospedagem Manus

**Objetivo:** Encontrar e remover redirect de `/` para `/admin`

**Passos:**
1. [ ] Acessar painel de gerenciamento do projeto no Manus
2. [ ] Procurar seção "Settings", "Configuration", "Redirects" ou similar
3. [ ] Verificar se há regra de redirect configurada:
   ```
   Source: /
   Destination: /admin
   Type: 301 ou 302
   ```
4. [ ] Se encontrar, **REMOVER** essa regra
5. [ ] Salvar alterações
6. [ ] Aguardar 1-2 minutos para propagação
7. [ ] Testar em aba anônima: `https://app.numero-virtual.com/`

**Resultado esperado:**
- ✅ Página carrega mostrando lista de serviços
- ✅ Sem redirecionamento para login

**Se não resolver:** Prosseguir para Ação 2

---

### 🟠 AÇÃO 2: Limpar Cache do CDN (Cloudflare)

**Objetivo:** Remover cache antigo que pode estar mantendo redirect

**Passos:**
1. [ ] Acessar painel do Cloudflare (https://dash.cloudflare.com)
2. [ ] Selecionar domínio `numero-virtual.com`
3. [ ] Ir em "Caching" no menu lateral
4. [ ] Clicar em "Purge Cache"
5. [ ] Selecionar "Purge Everything"
6. [ ] Confirmar ação
7. [ ] Aguardar 2-3 minutos para propagação global
8. [ ] Testar em aba anônima: `https://app.numero-virtual.com/`

**Alternativa (Purge seletivo):**
```
URLs para purgar:
https://app.numero-virtual.com/
https://app.numero-virtual.com/index.html
https://app.numero-virtual.com/assets/*
```

**Resultado esperado:**
- ✅ Página carrega mostrando lista de serviços
- ✅ Sem redirecionamento para login

**Se não resolver:** Prosseguir para Ação 3

---

### 🟡 AÇÃO 3: Verificar Configuração do Servidor Web

**Objetivo:** Encontrar redirect no Nginx/Apache

**Opção A: Se tiver acesso SSH ao servidor**

```bash
# 1. Conectar via SSH
ssh usuario@servidor

# 2. Verificar configuração Nginx
sudo cat /etc/nginx/sites-available/app.numero-virtual.com
sudo cat /etc/nginx/sites-enabled/app.numero-virtual.com
sudo grep -r "rewrite.*admin" /etc/nginx/

# 3. Verificar configuração Apache
sudo cat /etc/apache2/sites-available/app.numero-virtual.com.conf
sudo grep -r "Redirect.*admin" /etc/apache2/

# 4. Procurar por estas linhas (REMOVER se encontrar):
# Nginx:
#   rewrite ^/$ /admin permanent;
#   return 301 /admin;
# Apache:
#   Redirect 301 / /admin
#   RedirectMatch 301 ^/$ /admin
```

**Opção B: Se não tiver acesso SSH**

1. [ ] Entrar em contato com equipe de infraestrutura/DevOps
2. [ ] Solicitar verificação de regras de redirect no servidor web
3. [ ] Fornecer este documento como referência
4. [ ] Solicitar remoção de qualquer redirect de `/` para `/admin`

**Resultado esperado:**
- ✅ Página carrega mostrando lista de serviços
- ✅ Sem redirecionamento para login

**Se não resolver:** Prosseguir para Ação 4

---

### 🟢 AÇÃO 4: Debug Avançado com cURL

**Objetivo:** Identificar exatamente onde está ocorrendo o redirect

**Passos:**

```bash
# 1. Testar requisição direta (sem seguir redirects)
curl -v -L https://app.numero-virtual.com/ 2>&1 | grep -E "(Location:|HTTP/)"

# 2. Verificar headers de resposta
curl -I https://app.numero-virtual.com/

# 3. Verificar se há redirect em cadeia
curl -v https://app.numero-virtual.com/ 2>&1 | tee debug.log
```

**Analisar saída:**

- [ ] Procurar por `HTTP/1.1 301` ou `HTTP/1.1 302` (indica redirect)
- [ ] Procurar por `Location: /admin` ou similar
- [ ] Verificar se redirect vem do servidor ou de proxy intermediário

**Exemplo de saída problemática:**
```
< HTTP/1.1 301 Moved Permanently
< Location: https://app.numero-virtual.com/admin
```

**Exemplo de saída correta:**
```
< HTTP/1.1 200 OK
< Content-Type: text/html
```

**Se encontrar redirect:**
- [ ] Anotar o header `Server:` (indica qual servidor está causando)
- [ ] Anotar o header `Location:` (para onde está redirecionando)
- [ ] Usar essas informações para identificar onde corrigir

---

### 🔵 AÇÃO 5: Verificar Service Workers (Browser)

**Objetivo:** Remover cache local do browser

**Passos:**
1. [ ] Abrir aba anônima (Ctrl+Shift+N)
2. [ ] Acessar `https://app.numero-virtual.com/`
3. [ ] Abrir DevTools (F12)
4. [ ] Ir em aba "Application"
5. [ ] Seção "Service Workers" no menu lateral
6. [ ] Clicar em "Unregister" em todos os service workers listados
7. [ ] Seção "Storage" no menu lateral
8. [ ] Clicar em "Clear site data"
9. [ ] Confirmar
10. [ ] Fechar DevTools
11. [ ] Recarregar página (Ctrl+Shift+R)

**Resultado esperado:**
- ✅ Página carrega mostrando lista de serviços
- ✅ Sem redirecionamento para login

---

### 🟣 AÇÃO 6: Testar com Bypass de Cache

**Objetivo:** Confirmar se é problema de cache

**Passos:**
1. [ ] Abrir aba anônima
2. [ ] Acessar com parâmetro: `https://app.numero-virtual.com/?nocache=1`
3. [ ] Ou adicionar timestamp: `https://app.numero-virtual.com/?t=1234567890`

**Se funcionar com bypass:**
- ✅ Confirma que é problema de cache
- [ ] Voltar para Ação 2 (Limpar Cache do CDN)
- [ ] Verificar configurações de cache no Cloudflare/CDN

**Se não funcionar:**
- ❌ Não é problema de cache
- [ ] Foco em Ação 1 e Ação 3 (Redirects no servidor)

---

## 🎯 Validação Final

Após realizar as ações acima, validar com:

### Teste 1: Aba Anônima
```
1. Abrir aba anônima (Ctrl+Shift+N)
2. Acessar: https://app.numero-virtual.com/
3. Verificar: Página mostra lista de serviços
4. Verificar: Saldo mostra R$ 0,00
5. Verificar: Não há redirect para login
```

### Teste 2: DevTools Network
```
1. Abrir DevTools (F12)
2. Aba "Network"
3. Recarregar página
4. Verificar primeira requisição:
   - Status: 200 (não 301/302)
   - Type: document
   - URL: https://app.numero-virtual.com/
```

### Teste 3: Diferentes Rotas
```
1. Testar: https://app.numero-virtual.com/
2. Testar: https://app.numero-virtual.com/history
3. Testar: https://app.numero-virtual.com/account
4. Todas devem carregar sem redirect
```

---

## 📊 Registro de Ações Realizadas

Use esta tabela para documentar:

| Data/Hora | Ação | Resultado | Observações |
|-----------|------|-----------|-------------|
| ___ | Verificar painel Manus | ⬜ OK / ⬜ NOK | |
| ___ | Limpar cache CDN | ⬜ OK / ⬜ NOK | |
| ___ | Verificar servidor web | ⬜ OK / ⬜ NOK | |
| ___ | Debug com cURL | ⬜ OK / ⬜ NOK | |
| ___ | Limpar service workers | ⬜ OK / ⬜ NOK | |
| ___ | Testar bypass cache | ⬜ OK / ⬜ NOK | |

---

## 🆘 Se Nada Funcionar

Entrar em contato com:

1. **Suporte Manus:** https://help.manus.im
   - Mencionar: "Redirect indesejado de / para /admin"
   - Anexar: Este documento + ANALISE_CONFIGURACOES.md

2. **Administrador do Cloudflare:**
   - Solicitar verificação de Page Rules
   - Solicitar verificação de Workers
   - Solicitar verificação de configurações de cache

3. **Equipe de DevOps/Infraestrutura:**
   - Fornecer este checklist
   - Solicitar acesso aos logs do servidor
   - Solicitar verificação de proxy reverso (se houver)

---

## ✅ Sucesso!

Quando o problema for resolvido:

1. [ ] Documentar qual ação resolveu
2. [ ] Atualizar este checklist com a solução
3. [ ] Compartilhar solução com a equipe
4. [ ] Adicionar monitoramento para evitar recorrência
