#!/bin/bash
set -e

echo "Forçando rebuild completo..."

# Parar todos os processos relacionados
pkill -f "tsx watch" || true
pkill -f "vite" || true
pkill -f "tsc" || true

# Limpar todos os caches
rm -rf dist
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm -rf .tsbuildinfo
find . -name "*.tsbuildinfo" -delete

echo "Caches limpos. Aguardando 2 segundos..."
sleep 2

echo "Rebuild completo finalizado!"
