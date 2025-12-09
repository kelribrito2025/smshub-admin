#!/bin/bash

# ============================================
# Script de Deploy Automatizado - SMS Hub Admin
# ============================================
# Este script automatiza o processo de deploy
# da aplicação SMS Hub Admin no servidor Vultr
# ============================================

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções auxiliares
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está rodando como usuário correto
if [ "$USER" = "root" ]; then
    log_error "Não rode este script como root! Use o usuário 'deploy'."
    exit 1
fi

# Configurações
PROJECT_DIR="/home/deploy/smshub-admin"
BRANCH="${1:-main}"  # Branch padrão: main

log_info "Iniciando deploy da branch: $BRANCH"
echo "============================================"

# 1. Navegar para o diretório do projeto
log_info "Navegando para $PROJECT_DIR"
cd "$PROJECT_DIR" || {
    log_error "Diretório do projeto não encontrado!"
    exit 1
}

# 2. Fazer backup do .env (caso exista)
if [ -f .env ]; then
    log_info "Fazendo backup do arquivo .env"
    cp .env .env.backup
    log_success "Backup criado: .env.backup"
fi

# 3. Fazer stash de mudanças locais (se houver)
if ! git diff-index --quiet HEAD --; then
    log_warning "Existem mudanças locais não commitadas. Fazendo stash..."
    git stash
fi

# 4. Atualizar código do GitHub
log_info "Baixando última versão do código (branch: $BRANCH)"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
log_success "Código atualizado com sucesso!"

# 5. Restaurar .env (se foi feito backup)
if [ -f .env.backup ]; then
    log_info "Restaurando arquivo .env"
    mv .env.backup .env
fi

# 6. Instalar/atualizar dependências
log_info "Instalando dependências..."
pnpm install --frozen-lockfile
log_success "Dependências instaladas!"

# 7. Aplicar migrações do banco de dados
log_info "Aplicando migrações do banco de dados..."
pnpm db:push
log_success "Migrações aplicadas!"

# 8. Build da aplicação
log_info "Compilando aplicação (frontend)..."
pnpm build
log_success "Build concluído!"

# 9. Reiniciar aplicação com PM2
log_info "Reiniciando aplicação..."
pm2 restart smshub-admin
log_success "Aplicação reiniciada!"

# 10. Aguardar aplicação iniciar
log_info "Aguardando aplicação iniciar (5 segundos)..."
sleep 5

# 11. Verificar saúde da aplicação
log_info "Verificando saúde da aplicação..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    log_success "Aplicação está saudável!"
else
    log_error "Aplicação não está respondendo!"
    log_info "Verificando logs..."
    pm2 logs smshub-admin --lines 20 --nostream
    exit 1
fi

# 12. Salvar estado do PM2
log_info "Salvando estado do PM2..."
pm2 save
log_success "Estado salvo!"

# 13. Limpar cache antigo (opcional)
log_info "Limpando cache de build antigo..."
rm -rf dist/.vite 2>/dev/null || true
log_success "Cache limpo!"

echo ""
echo "============================================"
log_success "Deploy concluído com sucesso! 🚀"
echo "============================================"
echo ""
log_info "Comandos úteis:"
echo "  - Ver logs:       pm2 logs smshub-admin"
echo "  - Ver status:     pm2 status"
echo "  - Reiniciar:      pm2 restart smshub-admin"
echo "  - Parar:          pm2 stop smshub-admin"
echo ""
log_info "Acesse: https://numero-virtual.com"
echo ""
