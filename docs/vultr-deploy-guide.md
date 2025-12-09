# 🚀 Guia Completo de Deploy para Vultr - SMS Hub Admin

**Autor:** Manus AI  
**Data:** 09 de Dezembro de 2025  
**Versão:** 1.0  
**Projeto:** SMS Hub Admin (smshub-admin)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Requisitos e Custos](#requisitos-e-custos)
3. [Fase 1: Preparação do Servidor Vultr](#fase-1-preparação-do-servidor-vultr)
4. [Fase 2: Instalação de Dependências](#fase-2-instalação-de-dependências)
5. [Fase 3: Configuração do Projeto](#fase-3-configuração-do-projeto)
6. [Fase 4: Configuração do Nginx e SSL](#fase-4-configuração-do-nginx-e-ssl)
7. [Fase 5: Deploy Automatizado](#fase-5-deploy-automatizado)
8. [Fase 6: Monitoramento e Manutenção](#fase-6-monitoramento-e-manutenção)
9. [Troubleshooting](#troubleshooting)
10. [Checklist Final](#checklist-final)

---

## 🎯 Visão Geral

Este guia fornece instruções passo a passo para fazer deploy do projeto **SMS Hub Admin** em um servidor VPS da Vultr. O projeto é uma aplicação full-stack construída com React 19, Express 4, tRPC 11 e TiDB Cloud (MySQL).

### Arquitetura do Deploy

```
┌─────────────────────────────────────────────────────────────┐
│                    Usuários (Internet)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare DNS (numero-virtual.com)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Vultr VPS (Ubuntu 22.04)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Nginx (Proxy Reverso + SSL)                          │  │
│  │  - Porta 80 (HTTP → redirect 443)                     │  │
│  │  - Porta 443 (HTTPS)                                  │  │
│  └──────────────────┬────────────────────────────────────┘  │
│                     │                                        │
│                     ▼                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  PM2 (Gerenciador de Processos)                       │  │
│  │  - Node.js App (Porta 3000)                           │  │
│  │  - Auto-restart em caso de crash                      │  │
│  │  - Logs centralizados                                 │  │
│  └──────────────────┬────────────────────────────────────┘  │
│                     │                                        │
│                     ▼                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Aplicação SMS Hub Admin                              │  │
│  │  - Frontend (React 19 + Vite)                         │  │
│  │  - Backend (Express 4 + tRPC 11)                      │  │
│  └──────────────────┬────────────────────────────────────┘  │
└────────────────────┼────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              TiDB Cloud (Banco de Dados MySQL)              │
│              - Hospedado externamente                       │
│              - Conexão via SSL                              │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Trabalho

**Desenvolvimento (Manus)** → **Versionamento (GitHub)** → **Produção (Vultr)**

1. Você desenvolve e testa no ambiente Manus
2. Faz push do código para o repositório GitHub
3. GitHub Actions faz deploy automático para Vultr (ou deploy manual via SSH)

---

## 💰 Requisitos e Custos

### Recursos Mínimos Recomendados

| Recurso | Mínimo | Recomendado | Para 1000+ usuários |
|---------|--------|-------------|---------------------|
| **CPU** | 1 vCPU | 2 vCPU | 4 vCPU |
| **RAM** | 2 GB | 4 GB | 8 GB |
| **Armazenamento** | 50 GB SSD | 80 GB SSD | 160 GB SSD |
| **Largura de Banda** | 2 TB/mês | 3 TB/mês | 5 TB/mês |

### Custos Mensais Estimados (Vultr)

| Plano | Especificações | Custo/mês |
|-------|----------------|-----------|
| **Cloud Compute (Regular)** | 1 vCPU, 2 GB RAM, 55 GB SSD | $12/mês |
| **Cloud Compute (Regular)** | 2 vCPU, 4 GB RAM, 80 GB SSD | $24/mês |
| **Cloud Compute (Regular)** | 4 vCPU, 8 GB RAM, 160 GB SSD | $48/mês |

**Recomendação inicial:** Plano de $24/mês (2 vCPU, 4 GB RAM) é ideal para começar e suporta até 500 usuários simultâneos.

### Custos Adicionais

- **Domínio:** ~$12-15/ano (se ainda não tiver)
- **TiDB Cloud:** Grátis até 5 GB (depois ~$10-30/mês dependendo do uso)
- **Backups automáticos (Vultr):** $2-5/mês (opcional mas recomendado)

**Total estimado:** $26-29/mês (servidor + backup)

---

## 🖥️ Fase 1: Preparação do Servidor Vultr

### 1.1. Criar Conta na Vultr

Se ainda não tem conta:

1. Acesse [https://www.vultr.com](https://www.vultr.com)
2. Clique em **"Sign Up"**
3. Preencha seus dados e verifique o email
4. Adicione método de pagamento (cartão de crédito ou PayPal)

**Dica:** Vultr oferece crédito inicial de $100-300 para novos usuários (válido por 30-60 dias).

### 1.2. Criar Servidor VPS (Cloud Compute)

#### Passo 1: Acessar Deploy

1. Faça login no painel da Vultr
2. Clique no botão azul **"Deploy +"** no canto superior direito
3. Selecione **"Deploy New Server"**

#### Passo 2: Escolher Tipo de Servidor

- Selecione **"Cloud Compute - Shared CPU"**
- Esta opção é mais econômica e suficiente para a maioria dos casos

#### Passo 3: Escolher Localização

Escolha o data center mais próximo dos seus usuários:

- **São Paulo, Brasil** (recomendado para usuários brasileiros)
- **Miami, USA** (alternativa com boa latência para Brasil)
- **Nova York, USA** (boa opção para América do Norte)

**Dica:** Você pode testar a latência antes de escolher usando o [Vultr Speed Test](https://www.vultr.com/resources/faq/infrastructure/how-can-i-test-the-network-speed-between-vultr-locations/).

#### Passo 4: Escolher Sistema Operacional

- Selecione **"Ubuntu 22.04 LTS x64"**
- Esta é a versão testada e recomendada para este guia

#### Passo 5: Escolher Plano

Para começar, recomendo:

- **2 vCPU**
- **4 GB RAM**
- **80 GB SSD**
- **3 TB de largura de banda**
- **Custo:** $24/mês

#### Passo 6: Configurações Adicionais

**Habilitar IPv6:** Marque a opção (grátis e útil para futuro)

**Auto Backups:** Recomendo habilitar (+$2/mês)
- Backups diários automáticos
- Retenção de 7 dias
- Restauração com 1 clique

**Firewall:** Deixe desmarcado por enquanto (configuraremos via UFW)

**SSH Keys:** Se você já tem uma chave SSH, adicione aqui. Caso contrário, o Vultr criará uma senha root automaticamente.

#### Passo 7: Nomear o Servidor

- **Server Hostname:** `smshub-admin-prod`
- **Server Label:** `SMS Hub Admin - Produção`

#### Passo 8: Deploy

1. Clique em **"Deploy Now"**
2. Aguarde 2-5 minutos enquanto o servidor é provisionado
3. Quando o status mudar para **"Running"**, seu servidor está pronto

### 1.3. Acessar o Servidor via SSH

#### Obter Credenciais

1. No painel da Vultr, clique no servidor recém-criado
2. Anote o **IP Address** (exemplo: `45.76.123.45`)
3. Clique no ícone de olho ao lado de **"Password"** para revelar a senha root

#### Conectar via SSH

**No Linux/Mac:**

```bash
ssh root@45.76.123.45
```

**No Windows:**

Use o **PowerShell** ou **PuTTY**:

```powershell
ssh root@45.76.123.45
```

Quando perguntado, digite **"yes"** para aceitar a fingerprint e depois cole a senha.

**Dica:** Após o primeiro login, você verá uma mensagem de boas-vindas do Ubuntu.

### 1.4. Atualizar Sistema Operacional

Sempre atualize o sistema antes de instalar qualquer coisa:

```bash
# Atualizar lista de pacotes
apt update

# Atualizar todos os pacotes instalados
apt upgrade -y

# Instalar pacotes essenciais
apt install -y curl wget git build-essential
```

**Tempo estimado:** 3-5 minutos

### 1.5. Configurar Firewall (UFW)

O UFW (Uncomplicated Firewall) protege seu servidor bloqueando portas não autorizadas.

```bash
# Instalar UFW (geralmente já vem instalado)
apt install -y ufw

# Permitir SSH (porta 22) - IMPORTANTE: faça isso ANTES de habilitar o firewall
ufw allow 22/tcp

# Permitir HTTP (porta 80)
ufw allow 80/tcp

# Permitir HTTPS (porta 443)
ufw allow 443/tcp

# Habilitar firewall
ufw enable

# Verificar status
ufw status verbose
```

**Saída esperada:**

```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
22/tcp (v6)                ALLOW       Anywhere (v6)
80/tcp (v6)                ALLOW       Anywhere (v6)
443/tcp (v6)                ALLOW       Anywhere (v6)
```

### 1.6. Criar Usuário Não-Root (Segurança)

Por segurança, não devemos rodar aplicações como root. Vamos criar um usuário dedicado:

```bash
# Criar usuário 'deploy' com home directory
adduser deploy

# Você será solicitado a criar uma senha - escolha uma senha forte
# Pode pular os campos de informação pessoal (Enter, Enter, Enter...)

# Adicionar usuário ao grupo sudo (permissões administrativas)
usermod -aG sudo deploy

# Copiar chaves SSH do root para o novo usuário (se aplicável)
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy/
```

**Testar novo usuário:**

Abra uma **nova janela de terminal** (não feche a atual) e teste:

```bash
ssh deploy@45.76.123.45
```

Se conseguir logar, está tudo certo. Agora use o usuário `deploy` para os próximos passos.

### 1.7. Configurar Timezone (Opcional mas Recomendado)

Configure o timezone para Brasília para facilitar leitura de logs:

```bash
# Ver timezone atual
timedatectl

# Configurar para Brasília
sudo timedatectl set-timezone America/Sao_Paulo

# Verificar
date
```

**Saída esperada:**

```
Seg 09 Dez 2025 14:30:00 -03
```

---

## ✅ Checkpoint - Fase 1 Completa

Neste ponto você deve ter:

- ✅ Servidor VPS criado na Vultr
- ✅ Ubuntu 22.04 LTS instalado e atualizado
- ✅ Firewall (UFW) configurado com portas 22, 80, 443 abertas
- ✅ Usuário não-root (`deploy`) criado
- ✅ Acesso SSH funcionando
- ✅ Timezone configurado (opcional)

**Próxima etapa:** Instalação de dependências (Node.js, pnpm, PM2, Nginx)

---


## 📦 Fase 2: Instalação de Dependências

Nesta fase, instalaremos todas as ferramentas necessárias para rodar a aplicação SMS Hub Admin.

### 2.1. Instalar Node.js 22.x

O projeto requer Node.js versão 22.x. Vamos usar o repositório oficial NodeSource para garantir a versão correta.

#### Método 1: Via NodeSource (Recomendado)

```bash
# Baixar e executar script de setup do NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Instalar Node.js
sudo apt install -y nodejs

# Verificar instalação
node --version
npm --version
```

**Saída esperada:**

```
v22.13.0
10.9.0
```

#### Método 2: Via NVM (Alternativa)

Se preferir gerenciar múltiplas versões de Node.js:

```bash
# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recarregar shell
source ~/.bashrc

# Instalar Node.js 22
nvm install 22

# Definir como padrão
nvm alias default 22

# Verificar
node --version
```

### 2.2. Instalar pnpm

O projeto usa **pnpm** como gerenciador de pacotes (mais rápido e eficiente que npm).

```bash
# Instalar pnpm via npm
sudo npm install -g pnpm

# Verificar instalação
pnpm --version
```

**Saída esperada:**

```
9.15.0
```

**Alternativa via Corepack (Node.js 16.13+):**

```bash
# Habilitar Corepack (vem com Node.js)
sudo corepack enable

# Preparar pnpm
sudo corepack prepare pnpm@latest --activate

# Verificar
pnpm --version
```

### 2.3. Instalar PM2

**PM2** é um gerenciador de processos para Node.js que mantém sua aplicação rodando 24/7, reinicia automaticamente em caso de crash e gerencia logs.

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Verificar instalação
pm2 --version
```

**Saída esperada:**

```
5.3.0
```

#### Configurar PM2 para Iniciar com o Sistema

```bash
# Gerar script de startup (detecta automaticamente systemd/upstart/etc)
sudo pm2 startup

# Você verá uma mensagem como:
# [PM2] You have to run this command as root. Execute the following command:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deploy --hp /home/deploy

# COPIE E EXECUTE o comando sugerido (exemplo):
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deploy --hp /home/deploy
```

**Importante:** O comando exato pode variar dependendo do seu usuário e caminho do Node.js. Sempre use o comando que o PM2 sugerir.

### 2.4. Instalar Nginx

**Nginx** atuará como proxy reverso, servindo arquivos estáticos e encaminhando requisições da API para o Node.js.

```bash
# Instalar Nginx
sudo apt install -y nginx

# Verificar instalação
nginx -v
```

**Saída esperada:**

```
nginx version: nginx/1.18.0 (Ubuntu)
```

#### Iniciar e Habilitar Nginx

```bash
# Iniciar Nginx
sudo systemctl start nginx

# Habilitar para iniciar com o sistema
sudo systemctl enable nginx

# Verificar status
sudo systemctl status nginx
```

**Saída esperada:**

```
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)
     Active: active (running) since Mon 2025-12-09 14:45:00 -03; 5s ago
```

#### Testar Nginx

Abra um navegador e acesse o IP do seu servidor:

```
http://45.76.123.45
```

Você deve ver a página padrão de boas-vindas do Nginx:

```
Welcome to nginx!
If you see this page, the nginx web server is successfully installed and working.
```

### 2.5. Instalar Certbot (SSL/HTTPS)

**Certbot** é a ferramenta oficial da Let's Encrypt para obter certificados SSL gratuitos.

```bash
# Instalar Certbot e plugin do Nginx
sudo apt install -y certbot python3-certbot-nginx

# Verificar instalação
certbot --version
```

**Saída esperada:**

```
certbot 1.21.0
```

**Nota:** Não vamos configurar o SSL agora. Faremos isso na Fase 4, após configurar o domínio.

### 2.6. Instalar Ferramentas Adicionais (Opcional mas Recomendado)

#### htop (Monitor de Processos)

```bash
sudo apt install -y htop
```

Use `htop` para monitorar CPU, memória e processos em tempo real.

#### ncdu (Analisador de Disco)

```bash
sudo apt install -y ncdu
```

Use `ncdu /home/deploy` para ver quais pastas estão ocupando mais espaço.

#### fail2ban (Proteção contra Brute Force)

```bash
# Instalar fail2ban
sudo apt install -y fail2ban

# Copiar configuração padrão
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Habilitar e iniciar
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Verificar status
sudo fail2ban-client status
```

**fail2ban** monitora logs e bloqueia IPs que tentam fazer brute force em SSH.

---

## ✅ Checkpoint - Fase 2 Completa

Neste ponto você deve ter instalado:

- ✅ Node.js 22.x
- ✅ pnpm (gerenciador de pacotes)
- ✅ PM2 (gerenciador de processos)
- ✅ Nginx (servidor web/proxy reverso)
- ✅ Certbot (para SSL/HTTPS)
- ✅ Ferramentas adicionais (htop, ncdu, fail2ban)

**Verificação rápida:**

```bash
node --version    # v22.13.0
pnpm --version    # 9.15.0
pm2 --version     # 5.3.0
nginx -v          # nginx/1.18.0
certbot --version # certbot 1.21.0
```

**Próxima etapa:** Configuração do projeto e variáveis de ambiente

---


## ⚙️ Fase 3: Configuração do Projeto

Nesta fase, faremos o deploy do código da aplicação e configuraremos todas as variáveis de ambiente necessárias.

### 3.1. Clonar Repositório do GitHub

Primeiro, vamos clonar o código do projeto para o servidor.

#### Opção A: Repositório Público (Mais Simples)

Se seu repositório for público:

```bash
# Navegar para o diretório home do usuário deploy
cd /home/deploy

# Clonar repositório
git clone https://github.com/kelribrito2025/smshub-admin.git

# Entrar no diretório
cd smshub-admin
```

#### Opção B: Repositório Privado (Recomendado para Produção)

Se seu repositório for privado, você precisa configurar autenticação SSH:

**Passo 1: Gerar chave SSH no servidor**

```bash
# Gerar chave SSH (pressione Enter para aceitar padrões)
ssh-keygen -t ed25519 -C "deploy@smshub-admin"

# Exibir chave pública
cat ~/.ssh/id_ed25519.pub
```

**Passo 2: Adicionar chave ao GitHub**

1. Copie a chave pública exibida
2. Acesse GitHub → Settings → SSH and GPG keys
3. Clique em **"New SSH key"**
4. Cole a chave e salve

**Passo 3: Clonar repositório**

```bash
# Navegar para o diretório home
cd /home/deploy

# Clonar via SSH
git clone git@github.com:kelribrito2025/smshub-admin.git

# Entrar no diretório
cd smshub-admin
```

### 3.2. Instalar Dependências

```bash
# Instalar todas as dependências do projeto
pnpm install

# Tempo estimado: 2-5 minutos
```

**Saída esperada:**

```
Packages: +XXX
Progress: resolved XXX, reused XXX, downloaded XX, added XXX, done
```

### 3.3. Configurar Variáveis de Ambiente

O projeto SMS Hub Admin requer diversas variáveis de ambiente para funcionar. Vamos criar o arquivo `.env` com todas as configurações necessárias.

#### Criar Arquivo .env

```bash
# Criar arquivo .env
nano .env
```

#### Conteúdo do Arquivo .env

Cole o seguinte conteúdo e **substitua os valores** com suas credenciais reais:

```bash
# ============================================
# CONFIGURAÇÕES DO BANCO DE DADOS
# ============================================
DATABASE_URL="mysql://usuario:senha@host:4000/database?ssl={"rejectUnauthorized":true}"

# Exemplo real (substitua com suas credenciais TiDB Cloud):
# DATABASE_URL="mysql://4vK7xYz2mNpQrSt.root:SuaSenhaAqui@gateway01.us-west-2.prod.aws.tidbcloud.com:4000/smshub?ssl={"rejectUnauthorized":true}"

# ============================================
# AUTENTICAÇÃO E SEGURANÇA
# ============================================
JWT_SECRET="sua-chave-secreta-muito-forte-aqui-min-32-caracteres"
OWNER_OPEN_ID="seu-open-id-do-manus"
OWNER_NAME="Seu Nome"

# ============================================
# OAUTH (MANUS)
# ============================================
VITE_APP_ID="seu-app-id-do-manus"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://login.manus.im"

# ============================================
# FRONTEND
# ============================================
VITE_APP_TITLE="SMS Hub Admin"
VITE_APP_LOGO="/logo.svg"
VITE_FRONTEND_URL="https://numero-virtual.com"

# ============================================
# APIS INTERNAS (MANUS FORGE)
# ============================================
BUILT_IN_FORGE_API_URL="https://forge-api.manus.im"
BUILT_IN_FORGE_API_KEY="sua-chave-api-backend"
VITE_FRONTEND_FORGE_API_URL="https://forge-api.manus.im"
VITE_FRONTEND_FORGE_API_KEY="sua-chave-api-frontend"

# ============================================
# PAGAMENTOS - EFIPAY (PIX)
# ============================================
EFIPAY_ENVIRONMENT="production"
EFIPAY_CLIENT_ID_PROD="Client_Id_xxxxxxxxxxxxxxxxxxxxx"
EFIPAY_CLIENT_SECRET_PROD="Client_Secret_xxxxxxxxxxxxxxxxxxxxx"
EFIPAY_CLIENT_ID_SANDBOX="Client_Id_sandbox_xxxxxxxxxxxxxxxxxxxxx"
EFIPAY_CLIENT_SECRET_SANDBOX="Client_Secret_sandbox_xxxxxxxxxxxxxxxxxxxxx"
EFIPAY_PIX_KEY="sua-chave-pix@email.com"

# ============================================
# PAGAMENTOS - STRIPE
# ============================================
VITE_STRIPE_PUBLISHABLE_KEY="pk_live_xxxxxxxxxxxxxxxxxxxxx"
STRIPE_SECRET_KEY="sk_live_xxxxxxxxxxxxxxxxxxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxxxxxxx"

# ============================================
# EMAIL - MAILCHIMP/MANDRILL
# ============================================
MAILCHIMP_API_KEY="xxxxxxxxxxxxxxxxxxxxx-us21"
MAILCHIMP_FROM_EMAIL="noreply@numero-virtual.com"
MAILCHIMP_FROM_NAME="SMS Hub Admin"
MANDRILL_API_KEY="xxxxxxxxxxxxxxxxxxxxx"

# ============================================
# COTAÇÃO - AWESOMEAPI
# ============================================
AWESOMEAPI_TOKEN="d71e3b5ba355xxxxxxxxxxxxxxxxxxxxx"

# ============================================
# ANALYTICS (OPCIONAL)
# ============================================
VITE_ANALYTICS_ENDPOINT="https://analytics.exemplo.com"
VITE_ANALYTICS_WEBSITE_ID="seu-website-id"
```

**Salvar e sair:** Pressione `Ctrl + X`, depois `Y`, depois `Enter`.

#### Onde Obter Cada Credencial

| Variável | Onde Obter |
|----------|------------|
| **DATABASE_URL** | TiDB Cloud → Cluster → Connect → Standard Connection |
| **JWT_SECRET** | Gerar aleatoriamente: `openssl rand -base64 32` |
| **OWNER_OPEN_ID** | Manus Dashboard → Settings → Profile |
| **VITE_APP_ID** | Manus Dashboard → Project → Settings |
| **EFIPAY_CLIENT_ID_PROD** | EfiPay → Minha Conta → Aplicações → Produção |
| **EFIPAY_CLIENT_SECRET_PROD** | EfiPay → Minha Conta → Aplicações → Produção |
| **EFIPAY_PIX_KEY** | Sua chave PIX cadastrada na EfiPay |
| **STRIPE_SECRET_KEY** | Stripe Dashboard → Developers → API Keys |
| **STRIPE_WEBHOOK_SECRET** | Stripe Dashboard → Developers → Webhooks |
| **MAILCHIMP_API_KEY** | Mailchimp → Account → Extras → API Keys |
| **MANDRILL_API_KEY** | Mandrill → Settings → SMTP & API Info |
| **AWESOMEAPI_TOKEN** | AwesomeAPI → Criar conta → Gerar token |

#### Gerar JWT_SECRET Seguro

```bash
# Gerar chave aleatória de 32 bytes (256 bits)
openssl rand -base64 32
```

Copie a saída e use como valor de `JWT_SECRET`.

### 3.4. Configurar Banco de Dados

#### Verificar Conexão com TiDB Cloud

```bash
# Testar conexão (substitua com suas credenciais)
pnpm drizzle-kit studio
```

Se a conexão funcionar, você verá:

```
Drizzle Studio is running on http://localhost:4983
```

Pressione `Ctrl + C` para sair.

#### Aplicar Migrações

O projeto já possui todas as migrações necessárias. Vamos aplicá-las:

```bash
# Aplicar migrações ao banco de dados
pnpm db:push
```

**Saída esperada:**

```
✓ Applying migrations...
✓ Migrations applied successfully!
```

**Importante:** Este comando sincroniza o schema do Drizzle com o banco de dados TiDB Cloud. Ele cria todas as tabelas necessárias (customers, activations, recharges, etc.).

### 3.5. Build da Aplicação

Agora vamos compilar o frontend e preparar a aplicação para produção:

```bash
# Build do frontend (React + Vite)
pnpm build
```

**Tempo estimado:** 1-3 minutos

**Saída esperada:**

```
vite v5.x.x building for production...
✓ XXX modules transformed.
dist/index.html                  X.XX kB
dist/assets/index-XXXXXX.css     XX.XX kB │ gzip: XX.XX kB
dist/assets/index-XXXXXX.js      XXX.XX kB │ gzip: XX.XX kB
✓ built in XXs
```

O build cria uma pasta `dist/` com os arquivos estáticos otimizados do frontend.

### 3.6. Iniciar Aplicação com PM2

Agora vamos iniciar a aplicação usando PM2:

```bash
# Iniciar aplicação
pm2 start pnpm --name "smshub-admin" -- start

# Verificar status
pm2 status
```

**Saída esperada:**

```
┌─────┬────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┐
│ id  │ name           │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │
├─────┼────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┤
│ 0   │ smshub-admin   │ default     │ N/A     │ fork    │ 12345    │ 0s     │ 0    │ online    │ 0%       │ 50.0mb   │ deploy   │
└─────┴────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┘
```

#### Comandos Úteis do PM2

```bash
# Ver logs em tempo real
pm2 logs smshub-admin

# Ver logs apenas de erros
pm2 logs smshub-admin --err

# Reiniciar aplicação
pm2 restart smshub-admin

# Parar aplicação
pm2 stop smshub-admin

# Remover aplicação do PM2
pm2 delete smshub-admin

# Salvar configuração atual do PM2 (para sobreviver a reinicializações)
pm2 save
```

#### Configurar PM2 para Reiniciar Automaticamente

```bash
# Salvar lista de processos atual
pm2 save

# Verificar que o startup script está ativo
pm2 startup
```

Agora, se o servidor reiniciar, o PM2 iniciará automaticamente a aplicação.

### 3.7. Testar Aplicação Localmente

Antes de configurar o Nginx, vamos testar se a aplicação está rodando:

```bash
# Testar endpoint da API
curl http://localhost:3000/api/health

# Saída esperada:
# {"status":"ok"}
```

Se você ver `{"status":"ok"}`, a aplicação está funcionando corretamente!

---

## ✅ Checkpoint - Fase 3 Completa

Neste ponto você deve ter:

- ✅ Código clonado do GitHub
- ✅ Dependências instaladas (`pnpm install`)
- ✅ Arquivo `.env` configurado com todas as variáveis
- ✅ Banco de dados migrado (`pnpm db:push`)
- ✅ Aplicação compilada (`pnpm build`)
- ✅ Aplicação rodando com PM2
- ✅ Teste local funcionando (`curl http://localhost:3000`)

**Verificação rápida:**

```bash
pm2 status                        # Deve mostrar "online"
curl http://localhost:3000/api/health  # Deve retornar {"status":"ok"}
```

**Próxima etapa:** Configuração do Nginx e SSL (HTTPS)

---


## 🌐 Fase 4: Configuração do Nginx e SSL

Nesta fase, configuraremos o Nginx como proxy reverso e instalaremos certificado SSL para HTTPS.

### 4.1. Configurar DNS (Domínio)

Antes de configurar o Nginx e SSL, você precisa apontar seu domínio para o servidor Vultr.

#### Obter IP do Servidor

```bash
# Ver IP público do servidor
curl -4 ifconfig.me
```

Anote este IP (exemplo: `45.76.123.45`).

#### Configurar Registros DNS

Acesse o painel de controle do seu provedor de domínio (Registro.br, GoDaddy, Cloudflare, etc.) e crie os seguintes registros:

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| **A** | `@` | `45.76.123.45` | 3600 |
| **A** | `www` | `45.76.123.45` | 3600 |

**Explicação:**
- `@` aponta o domínio raiz (`numero-virtual.com`) para o servidor
- `www` aponta o subdomínio (`www.numero-virtual.com`) para o servidor

#### Verificar Propagação DNS

A propagação DNS pode levar de 5 minutos a 48 horas. Verifique com:

```bash
# Verificar domínio raiz
dig +short numero-virtual.com

# Verificar subdomínio www
dig +short www.numero-virtual.com

# Ambos devem retornar o IP do servidor: 45.76.123.45
```

**Alternativa:** Use [https://dnschecker.org](https://dnschecker.org) para verificar a propagação global.

### 4.2. Criar Configuração do Nginx

Vamos criar um arquivo de configuração específico para o SMS Hub Admin.

```bash
# Criar arquivo de configuração
sudo nano /etc/nginx/sites-available/smshub-admin
```

Cole o seguinte conteúdo (substitua `numero-virtual.com` pelo seu domínio):

```nginx
# Redirecionar www para domínio raiz
server {
    listen 80;
    listen [::]:80;
    server_name www.numero-virtual.com;
    return 301 https://numero-virtual.com$request_uri;
}

# Servidor principal
server {
    listen 80;
    listen [::]:80;
    server_name numero-virtual.com;

    # Logs
    access_log /var/log/nginx/smshub-admin-access.log;
    error_log /var/log/nginx/smshub-admin-error.log;

    # Tamanho máximo de upload (para arquivos)
    client_max_body_size 10M;

    # Proxy para Node.js (backend + frontend)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # Headers necessários
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Cache bypass
        proxy_cache_bypass $http_upgrade;
    }

    # Webhook EfiPay (PIX) - sem timeout
    location /api/pix/webhook {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts maiores para webhooks
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Webhook Stripe - sem timeout
    location /api/stripe/webhook {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts maiores para webhooks
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
```

**Salvar e sair:** Pressione `Ctrl + X`, depois `Y`, depois `Enter`.

### 4.3. Ativar Configuração

```bash
# Criar link simbólico para ativar o site
sudo ln -s /etc/nginx/sites-available/smshub-admin /etc/nginx/sites-enabled/

# Remover configuração padrão do Nginx (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t
```

**Saída esperada:**

```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Se houver erros, revise o arquivo de configuração.

### 4.4. Reiniciar Nginx

```bash
# Recarregar configuração do Nginx
sudo systemctl reload nginx

# Verificar status
sudo systemctl status nginx
```

### 4.5. Testar Acesso HTTP

Agora você deve conseguir acessar seu site via HTTP:

```
http://numero-virtual.com
```

Abra um navegador e verifique se o site carrega corretamente.

### 4.6. Instalar Certificado SSL (HTTPS)

Agora vamos usar o Certbot para obter um certificado SSL gratuito da Let's Encrypt.

#### Executar Certbot

```bash
# Obter certificado SSL e configurar Nginx automaticamente
sudo certbot --nginx -d numero-virtual.com -d www.numero-virtual.com
```

**O Certbot fará algumas perguntas:**

1. **Email address:** Digite seu email (para notificações de expiração)
2. **Terms of Service:** Digite `Y` para aceitar
3. **Share email with EFF:** Digite `N` (opcional)
4. **Redirect HTTP to HTTPS:** Digite `2` (redirecionar automaticamente)

**Saída esperada:**

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/numero-virtual.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/numero-virtual.com/privkey.pem
This certificate expires on 2026-03-09.
These files will be updated when the certificate renews.
Certbot has set up a scheduled task to automatically renew this certificate in the background.

Deploying certificate
Successfully deployed certificate for numero-virtual.com to /etc/nginx/sites-enabled/smshub-admin
Successfully deployed certificate for www.numero-virtual.com to /etc/nginx/sites-enabled/smshub-admin
Congratulations! You have successfully enabled HTTPS on https://numero-virtual.com and https://www.numero-virtual.com
```

#### Verificar Renovação Automática

O Certbot configura automaticamente um timer para renovar o certificado antes de expirar (certificados Let's Encrypt duram 90 dias).

```bash
# Testar renovação (dry-run)
sudo certbot renew --dry-run
```

**Saída esperada:**

```
Congratulations, all simulated renewals succeeded:
  /etc/letsencrypt/live/numero-virtual.com/fullchain.pem (success)
```

### 4.7. Testar Acesso HTTPS

Agora acesse seu site via HTTPS:

```
https://numero-virtual.com
```

Você deve ver:
- ✅ Cadeado verde na barra de endereços
- ✅ Site carregando normalmente
- ✅ Redirecionamento automático de HTTP para HTTPS

#### Verificar Qualidade do SSL

Use [SSL Labs](https://www.ssllabs.com/ssltest/) para testar a configuração SSL:

```
https://www.ssllabs.com/ssltest/analyze.html?d=numero-virtual.com
```

Você deve obter nota **A** ou **A+**.

### 4.8. Configurar Headers de Segurança (Opcional mas Recomendado)

Adicione headers de segurança à configuração do Nginx:

```bash
# Editar configuração
sudo nano /etc/nginx/sites-available/smshub-admin
```

Adicione as seguintes linhas dentro do bloco `server` (após `server_name`):

```nginx
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # HSTS (HTTP Strict Transport Security)
    # Força HTTPS por 1 ano
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

**Salvar e testar:**

```bash
# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### 4.9. Configurar Rate Limiting (Proteção contra DDoS)

Adicione rate limiting para proteger contra ataques:

```bash
# Editar configuração principal do Nginx
sudo nano /etc/nginx/nginx.conf
```

Adicione dentro do bloco `http` (antes dos blocos `server`):

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
```

Depois, edite a configuração do site:

```bash
sudo nano /etc/nginx/sites-available/smshub-admin
```

Adicione rate limiting para rotas específicas:

```nginx
    # Rate limiting para API
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Rate limiting para login
    location /api/oauth/callback {
        limit_req zone=login_limit burst=3 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

**Salvar, testar e recarregar:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ Checkpoint - Fase 4 Completa

Neste ponto você deve ter:

- ✅ DNS configurado apontando para o servidor
- ✅ Nginx configurado como proxy reverso
- ✅ Certificado SSL instalado (HTTPS funcionando)
- ✅ Redirecionamento automático HTTP → HTTPS
- ✅ Headers de segurança configurados
- ✅ Rate limiting ativo (proteção contra DDoS)
- ✅ Renovação automática do SSL configurada

**Verificação rápida:**

```bash
# Testar HTTPS
curl -I https://numero-virtual.com

# Deve retornar: HTTP/2 200
# E headers de segurança (X-Frame-Options, etc.)
```

**Teste no navegador:**
- Acesse `https://numero-virtual.com`
- Verifique cadeado verde
- Teste funcionalidades (login, dashboard, etc.)

**Próxima etapa:** Scripts de deploy automatizado

---


## 🤖 Fase 5: Deploy Automatizado

Nesta fase, configuraremos scripts e GitHub Actions para automatizar o processo de deploy.

### 5.1. Script de Deploy Manual

Já criamos um script de deploy automatizado em `scripts/deploy.sh`. Este script:

1. Atualiza o código do GitHub
2. Instala dependências
3. Aplica migrações do banco
4. Compila o frontend
5. Reinicia a aplicação
6. Verifica a saúde da aplicação

#### Usar o Script Manualmente

```bash
# No servidor Vultr, como usuário 'deploy'
cd /home/deploy/smshub-admin
./scripts/deploy.sh
```

**Opções:**

```bash
# Deploy de branch específica
./scripts/deploy.sh develop

# Deploy da branch main (padrão)
./scripts/deploy.sh main
```

### 5.2. Configurar GitHub Actions (Deploy Automático)

Vamos configurar GitHub Actions para fazer deploy automático sempre que você fizer push para a branch `main`.

#### Passo 1: Gerar Chave SSH no Servidor

Se ainda não fez isso na Fase 3:

```bash
# No servidor Vultr, como usuário 'deploy'
ssh-keygen -t ed25519 -C "github-actions-deploy"

# Adicionar chave pública ao authorized_keys
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys

# Exibir chave privada (copie todo o conteúdo)
cat ~/.ssh/id_ed25519
```

**Copie a chave privada completa** (incluindo `-----BEGIN OPENSSH PRIVATE KEY-----` e `-----END OPENSSH PRIVATE KEY-----`).

#### Passo 2: Adicionar Secrets no GitHub

1. Acesse seu repositório no GitHub
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **"New repository secret"**

Adicione os seguintes secrets:

| Nome | Valor |
|------|-------|
| **VULTR_HOST** | IP do servidor (ex: `45.76.123.45`) |
| **VULTR_USERNAME** | `deploy` |
| **VULTR_SSH_KEY** | Chave privada SSH (todo o conteúdo de `id_ed25519`) |

#### Passo 3: Criar Workflow do GitHub Actions

O arquivo `.github/workflows/deploy.yml` já foi criado no projeto. Vamos fazer commit e push:

```bash
# No seu ambiente Manus (ou localmente)
git add .github/workflows/deploy.yml
git add scripts/deploy.sh
git commit -m "feat: adicionar GitHub Actions para deploy automático"
git push origin main
```

#### Passo 4: Testar Deploy Automático

1. Faça qualquer mudança no código
2. Commit e push para a branch `main`
3. Acesse GitHub → Actions
4. Você verá o workflow "Deploy to Vultr" rodando
5. Aguarde a conclusão (2-5 minutos)

**Fluxo completo:**

```
Você faz push → GitHub Actions detecta → Conecta via SSH → Executa deploy.sh → Aplicação atualizada
```

### 5.3. Deploy Manual via SSH (Alternativa)

Se preferir fazer deploy manual sem GitHub Actions:

#### Método 1: Via SSH + Git Pull

```bash
# Conectar ao servidor
ssh deploy@45.76.123.45

# Executar script de deploy
cd /home/deploy/smshub-admin
./scripts/deploy.sh
```

#### Método 2: Via SSH + Comando Único

```bash
# Do seu computador local
ssh deploy@45.76.123.45 "cd /home/deploy/smshub-admin && ./scripts/deploy.sh"
```

### 5.4. Rollback (Reverter Deploy)

Se algo der errado após o deploy, você pode reverter para a versão anterior:

```bash
# No servidor Vultr
cd /home/deploy/smshub-admin

# Ver histórico de commits
git log --oneline -10

# Reverter para commit específico (substitua HASH pelo hash do commit)
git checkout HASH

# Executar deploy da versão antiga
./scripts/deploy.sh

# Ou reverter para o commit anterior
git checkout HEAD~1
./scripts/deploy.sh
```

### 5.5. Monitoramento de Deploy

#### Ver Logs em Tempo Real

```bash
# Logs da aplicação
pm2 logs smshub-admin

# Logs apenas de erros
pm2 logs smshub-admin --err

# Últimas 100 linhas
pm2 logs smshub-admin --lines 100
```

#### Ver Status da Aplicação

```bash
# Status geral
pm2 status

# Informações detalhadas
pm2 show smshub-admin

# Monitoramento em tempo real
pm2 monit
```

#### Ver Logs do Nginx

```bash
# Logs de acesso
sudo tail -f /var/log/nginx/smshub-admin-access.log

# Logs de erro
sudo tail -f /var/log/nginx/smshub-admin-error.log

# Últimas 50 linhas de erro
sudo tail -50 /var/log/nginx/smshub-admin-error.log
```

### 5.6. Notificações de Deploy (Opcional)

Você pode adicionar notificações ao workflow do GitHub Actions.

#### Exemplo: Notificação via Webhook

Edite `.github/workflows/deploy.yml` e adicione:

```yaml
      - name: Notify via Webhook
        if: always()
        run: |
          STATUS="${{ job.status }}"
          curl -X POST https://seu-webhook.com/notify \
            -H "Content-Type: application/json" \
            -d "{\"status\": \"$STATUS\", \"branch\": \"${{ github.ref }}\", \"commit\": \"${{ github.sha }}\"}"
```

#### Exemplo: Notificação via Telegram

1. Crie um bot no Telegram via [@BotFather](https://t.me/BotFather)
2. Obtenha o token do bot
3. Obtenha seu chat ID (use [@userinfobot](https://t.me/userinfobot))
4. Adicione secrets no GitHub: `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`
5. Adicione ao workflow:

```yaml
      - name: Notify via Telegram
        if: always()
        run: |
          STATUS="${{ job.status }}"
          MESSAGE="🚀 Deploy Status: $STATUS%0ABranch: ${{ github.ref }}%0ACommit: ${{ github.sha }}"
          curl -X POST "https://api.telegram.org/bot${{ secrets.TELEGRAM_BOT_TOKEN }}/sendMessage" \
            -d "chat_id=${{ secrets.TELEGRAM_CHAT_ID }}&text=$MESSAGE"
```

---

## ✅ Checkpoint - Fase 5 Completa

Neste ponto você deve ter:

- ✅ Script de deploy manual (`scripts/deploy.sh`)
- ✅ GitHub Actions configurado para deploy automático
- ✅ Secrets configurados no GitHub
- ✅ Workflow testado e funcionando
- ✅ Comandos de monitoramento e rollback documentados

**Verificação rápida:**

```bash
# Testar script de deploy
./scripts/deploy.sh

# Ver logs do GitHub Actions
# GitHub → Actions → Ver último workflow
```

**Próxima etapa:** Monitoramento e manutenção contínua

---


## 📊 Fase 6: Monitoramento e Manutenção

Após o deploy, é essencial monitorar a aplicação e realizar manutenção regular.

### 6.1. Monitoramento de Recursos

#### Verificar Uso de CPU e Memória

```bash
# Visão geral do sistema
htop

# Uso de memória
free -h

# Uso de disco
df -h

# Análise detalhada de disco
ncdu /home/deploy
```

#### Monitorar Processos Node.js

```bash
# Status do PM2
pm2 status

# Uso de CPU/memória por processo
pm2 monit

# Informações detalhadas
pm2 show smshub-admin
```

### 6.2. Logs e Debugging

#### Logs da Aplicação

```bash
# Logs em tempo real
pm2 logs smshub-admin

# Apenas erros
pm2 logs smshub-admin --err

# Últimas 200 linhas
pm2 logs smshub-admin --lines 200

# Salvar logs em arquivo
pm2 logs smshub-admin --lines 1000 > logs-$(date +%Y%m%d).txt
```

#### Logs do Nginx

```bash
# Logs de acesso (requisições)
sudo tail -f /var/log/nginx/smshub-admin-access.log

# Logs de erro
sudo tail -f /var/log/nginx/smshub-admin-error.log

# Filtrar erros 5xx
sudo grep " 5[0-9][0-9] " /var/log/nginx/smshub-admin-access.log
```

#### Logs do Sistema

```bash
# Logs do systemd (Nginx, PM2, etc.)
sudo journalctl -u nginx -f

# Logs de autenticação (SSH, login)
sudo tail -f /var/log/auth.log

# Logs do kernel
sudo dmesg | tail -50
```

### 6.3. Backups

#### Backup do Banco de Dados

O banco de dados TiDB Cloud já possui backups automáticos, mas você pode fazer backups manuais:

```bash
# Criar diretório de backups
mkdir -p /home/deploy/backups

# Backup manual (se usar MySQL local)
# mysqldump -u usuario -p database > /home/deploy/backups/db-$(date +%Y%m%d).sql
```

**Nota:** Como você usa TiDB Cloud, os backups são gerenciados pela plataforma. Acesse o painel do TiDB Cloud para configurar retenção e restauração.

#### Backup do Código

```bash
# O código está no GitHub, mas você pode fazer backup local
cd /home/deploy
tar -czf backups/code-$(date +%Y%m%d).tar.gz smshub-admin/

# Manter apenas últimos 7 backups
cd backups
ls -t code-*.tar.gz | tail -n +8 | xargs rm -f
```

#### Backup do .env

```bash
# Backup das variáveis de ambiente (IMPORTANTE!)
cp /home/deploy/smshub-admin/.env /home/deploy/backups/env-$(date +%Y%m%d).backup

# Criptografar backup (recomendado)
gpg -c /home/deploy/backups/env-$(date +%Y%m%d).backup
```

### 6.4. Atualizações de Segurança

#### Atualizar Sistema Operacional

```bash
# Atualizar lista de pacotes
sudo apt update

# Ver atualizações disponíveis
apt list --upgradable

# Atualizar todos os pacotes
sudo apt upgrade -y

# Atualizar pacotes de segurança apenas
sudo apt upgrade -y --security

# Reiniciar se necessário
sudo reboot
```

**Recomendação:** Configure atualizações automáticas de segurança:

```bash
# Instalar unattended-upgrades
sudo apt install -y unattended-upgrades

# Habilitar
sudo dpkg-reconfigure -plow unattended-upgrades
```

#### Atualizar Node.js e Dependências

```bash
# Atualizar Node.js (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Atualizar pnpm
sudo npm install -g pnpm@latest

# Atualizar PM2
sudo npm install -g pm2@latest

# Atualizar dependências do projeto
cd /home/deploy/smshub-admin
pnpm update
```

### 6.5. Otimizações de Performance

#### Habilitar Cache do Nginx

Edite `/etc/nginx/sites-available/smshub-admin`:

```nginx
# Adicionar no topo do arquivo (fora dos blocos server)
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m max_size=100m inactive=60m use_temp_path=off;

# Adicionar dentro do bloco location /
location / {
    proxy_cache app_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_bypass $http_cache_control;
    add_header X-Cache-Status $upstream_cache_status;
    
    # ... resto da configuração
}
```

#### Configurar Swap (se RAM < 4GB)

```bash
# Criar arquivo de swap de 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Tornar permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verificar
free -h
```

#### Limpar Cache e Logs Antigos

```bash
# Limpar cache do apt
sudo apt clean
sudo apt autoclean
sudo apt autoremove -y

# Limpar logs antigos do PM2
pm2 flush

# Limpar logs antigos do sistema (manter últimos 7 dias)
sudo journalctl --vacuum-time=7d

# Limpar logs antigos do Nginx (manter últimos 14 dias)
sudo find /var/log/nginx -name "*.log.*" -mtime +14 -delete
```

### 6.6. Alertas e Notificações

#### Configurar Alertas de Disco Cheio

Crie um script de monitoramento:

```bash
# Criar script
nano /home/deploy/scripts/check-disk.sh
```

Conteúdo:

```bash
#!/bin/bash
THRESHOLD=80
USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$USAGE" -gt "$THRESHOLD" ]; then
    echo "⚠️ ALERTA: Disco em $USAGE% de uso!"
    # Adicione aqui notificação via webhook, email, etc.
fi
```

Adicione ao crontab:

```bash
# Tornar executável
chmod +x /home/deploy/scripts/check-disk.sh

# Adicionar ao crontab (rodar a cada hora)
crontab -e

# Adicionar linha:
0 * * * * /home/deploy/scripts/check-disk.sh
```

#### Configurar Alertas de Aplicação Offline

```bash
# Criar script
nano /home/deploy/scripts/check-health.sh
```

Conteúdo:

```bash
#!/bin/bash
if ! curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "⚠️ ALERTA: Aplicação offline!"
    pm2 restart smshub-admin
    # Adicione aqui notificação via webhook, email, etc.
fi
```

Adicione ao crontab:

```bash
chmod +x /home/deploy/scripts/check-health.sh
crontab -e

# Adicionar linha (rodar a cada 5 minutos):
*/5 * * * * /home/deploy/scripts/check-health.sh
```

---

## 🔧 Troubleshooting

Problemas comuns e soluções.

### Problema 1: Aplicação Não Inicia

**Sintomas:**
- `pm2 status` mostra status "errored" ou "stopped"
- Logs mostram erro de conexão com banco

**Soluções:**

```bash
# Verificar logs
pm2 logs smshub-admin --err

# Verificar variáveis de ambiente
cat /home/deploy/smshub-admin/.env | grep DATABASE_URL

# Testar conexão com banco
cd /home/deploy/smshub-admin
pnpm drizzle-kit studio

# Reiniciar aplicação
pm2 restart smshub-admin
```

### Problema 2: Erro 502 Bad Gateway

**Sintomas:**
- Navegador mostra "502 Bad Gateway"
- Nginx está rodando mas aplicação não responde

**Soluções:**

```bash
# Verificar se aplicação está rodando
pm2 status

# Verificar se porta 3000 está em uso
sudo netstat -tulpn | grep :3000

# Reiniciar aplicação
pm2 restart smshub-admin

# Verificar logs do Nginx
sudo tail -50 /var/log/nginx/smshub-admin-error.log

# Testar aplicação diretamente
curl http://localhost:3000/api/health
```

### Problema 3: SSL Não Funciona

**Sintomas:**
- Navegador mostra "Conexão não é segura"
- Certificado expirado ou inválido

**Soluções:**

```bash
# Verificar certificados
sudo certbot certificates

# Renovar certificado manualmente
sudo certbot renew

# Testar renovação
sudo certbot renew --dry-run

# Verificar configuração do Nginx
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### Problema 4: Webhook PIX Não Funciona

**Sintomas:**
- Pagamentos PIX não são creditados automaticamente
- Logs não mostram chamadas de webhook

**Soluções:**

```bash
# Verificar se webhook está configurado
cd /home/deploy/smshub-admin
node scripts/setup-webhook.mjs

# Testar webhook manualmente
curl -X POST https://numero-virtual.com/api/pix/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verificar logs da aplicação
pm2 logs smshub-admin | grep webhook

# Verificar logs do Nginx
sudo tail -100 /var/log/nginx/smshub-admin-access.log | grep webhook
```

### Problema 5: Aplicação Lenta

**Sintomas:**
- Páginas demoram para carregar
- Alta latência nas requisições

**Soluções:**

```bash
# Verificar uso de CPU/memória
htop

# Verificar processos pesados
ps aux --sort=-%mem | head -10

# Verificar conexões ativas
sudo netstat -an | grep :3000 | wc -l

# Verificar logs de erro
pm2 logs smshub-admin --err

# Reiniciar aplicação
pm2 restart smshub-admin

# Limpar cache
pm2 flush
```

### Problema 6: Disco Cheio

**Sintomas:**
- Aplicação não inicia
- Erro "No space left on device"

**Soluções:**

```bash
# Verificar uso de disco
df -h

# Encontrar arquivos grandes
sudo du -h /home/deploy | sort -rh | head -20

# Limpar logs antigos
pm2 flush
sudo journalctl --vacuum-time=3d
sudo find /var/log -name "*.log.*" -mtime +7 -delete

# Limpar cache do apt
sudo apt clean
sudo apt autoremove -y

# Verificar novamente
df -h
```

---

## ✅ Checklist Final

Use este checklist para garantir que tudo está configurado corretamente.

### Infraestrutura

- [ ] Servidor VPS criado na Vultr
- [ ] Ubuntu 22.04 LTS instalado e atualizado
- [ ] Firewall (UFW) configurado (portas 22, 80, 443)
- [ ] Usuário não-root (`deploy`) criado
- [ ] Timezone configurado para Brasília

### Dependências

- [ ] Node.js 22.x instalado
- [ ] pnpm instalado
- [ ] PM2 instalado e configurado para iniciar com o sistema
- [ ] Nginx instalado e rodando
- [ ] Certbot instalado

### Projeto

- [ ] Código clonado do GitHub
- [ ] Dependências instaladas (`pnpm install`)
- [ ] Arquivo `.env` configurado com todas as variáveis
- [ ] Banco de dados migrado (`pnpm db:push`)
- [ ] Aplicação compilada (`pnpm build`)
- [ ] Aplicação rodando com PM2
- [ ] Teste local funcionando (`curl http://localhost:3000/api/health`)

### Nginx e SSL

- [ ] DNS configurado apontando para o servidor
- [ ] Nginx configurado como proxy reverso
- [ ] Certificado SSL instalado (HTTPS funcionando)
- [ ] Redirecionamento HTTP → HTTPS ativo
- [ ] Headers de segurança configurados
- [ ] Rate limiting ativo

### Deploy Automatizado

- [ ] Script de deploy (`scripts/deploy.sh`) criado e testado
- [ ] GitHub Actions configurado
- [ ] Secrets adicionados no GitHub (VULTR_HOST, VULTR_USERNAME, VULTR_SSH_KEY)
- [ ] Workflow testado e funcionando

### Monitoramento

- [ ] Logs da aplicação acessíveis (`pm2 logs`)
- [ ] Logs do Nginx acessíveis
- [ ] Backups configurados (código, .env)
- [ ] Atualizações automáticas de segurança habilitadas
- [ ] Scripts de monitoramento criados (disco, saúde)

### Testes Finais

- [ ] Site acessível via HTTPS: `https://numero-virtual.com`
- [ ] Cadeado verde no navegador (SSL válido)
- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] Webhook PIX configurado e testado
- [ ] Webhook Stripe configurado e testado
- [ ] Todas as funcionalidades críticas testadas

---

## 📚 Comandos de Referência Rápida

### Gerenciamento da Aplicação

```bash
# Iniciar aplicação
pm2 start pnpm --name "smshub-admin" -- start

# Parar aplicação
pm2 stop smshub-admin

# Reiniciar aplicação
pm2 restart smshub-admin

# Ver logs
pm2 logs smshub-admin

# Ver status
pm2 status

# Monitoramento em tempo real
pm2 monit
```

### Nginx

```bash
# Testar configuração
sudo nginx -t

# Recarregar configuração
sudo systemctl reload nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver status
sudo systemctl status nginx

# Ver logs
sudo tail -f /var/log/nginx/smshub-admin-error.log
```

### SSL/Certbot

```bash
# Renovar certificado
sudo certbot renew

# Testar renovação
sudo certbot renew --dry-run

# Ver certificados
sudo certbot certificates
```

### Deploy

```bash
# Deploy manual
cd /home/deploy/smshub-admin
./scripts/deploy.sh

# Deploy de branch específica
./scripts/deploy.sh develop

# Ver logs do deploy
pm2 logs smshub-admin
```

### Monitoramento

```bash
# Uso de recursos
htop
free -h
df -h

# Processos
ps aux --sort=-%mem | head -10

# Conexões ativas
sudo netstat -tulpn | grep :3000

# Logs do sistema
sudo journalctl -u nginx -f
```

---

## 🎉 Conclusão

Parabéns! Você concluiu o deploy completo do **SMS Hub Admin** no servidor Vultr.

### O Que Você Conquistou

Neste guia, você configurou uma infraestrutura de produção completa, incluindo servidor VPS, banco de dados em nuvem, proxy reverso com Nginx, certificado SSL gratuito, deploy automatizado via GitHub Actions e monitoramento contínuo. A aplicação agora está rodando 24/7 com alta disponibilidade, segurança e performance otimizada.

### Próximos Passos Recomendados

**Curto prazo (1-2 semanas):**
- Monitore logs diariamente para identificar erros
- Teste todas as funcionalidades críticas (login, pagamentos, webhooks)
- Configure alertas de disco e saúde da aplicação
- Faça backup manual do `.env` em local seguro

**Médio prazo (1-3 meses):**
- Configure monitoramento avançado (Uptime Robot, Pingdom, etc.)
- Implemente analytics (Google Analytics, Plausible, etc.)
- Configure CDN (Cloudflare) para melhor performance global
- Otimize queries do banco de dados baseado em logs

**Longo prazo (3-6 meses):**
- Considere escalar verticalmente (mais CPU/RAM) se necessário
- Implemente cache Redis para sessões e dados frequentes
- Configure load balancer se tráfego crescer muito
- Migre para cluster multi-servidor para alta disponibilidade

### Suporte e Recursos

**Documentação oficial:**
- [Vultr Docs](https://www.vultr.com/docs/)
- [Nginx Docs](https://nginx.org/en/docs/)
- [PM2 Docs](https://pm2.keymetrics.io/docs/)
- [Let's Encrypt Docs](https://letsencrypt.org/docs/)

**Comunidade:**
- [Stack Overflow](https://stackoverflow.com/)
- [Reddit r/webdev](https://www.reddit.com/r/webdev/)
- [Dev.to](https://dev.to/)

**Contato:**
- Para dúvidas sobre o Manus: [https://help.manus.im](https://help.manus.im)
- Para suporte técnico do projeto: Abra uma issue no GitHub

---

**Boa sorte com seu projeto! 🚀**

*Este guia foi gerado por Manus AI em 09 de Dezembro de 2025.*
