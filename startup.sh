#!/bin/bash
set -e  # Exit on error

# Startup script para Concilia Brasil - Azure App Service Linux
# Logs disponíveis em: /home/LogFiles/startup.log

echo "=== STARTUP: Iniciando Concilia Brasil ==="
echo "Timestamp: $(date)"
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Working directory: $(pwd)"

# CRITICAL: Verificar se node_modules existe
if [ ! -d "node_modules" ] || [ ! "$(ls -A node_modules)" ]; then
  echo "⚠️  node_modules vazio ou ausente!"
  
  # Verificar se existe tar.gz para extrair
  if [ -f "node_modules.tar.gz" ]; then
    echo "⏳ Extraindo node_modules.tar.gz..."
    tar -xzf node_modules.tar.gz
    echo "✅ node_modules extraído"
  else
    echo "❌ ERRO: node_modules.tar.gz não encontrado!"
    echo "Tentando npm ci como fallback..."
    npm ci --production --prefer-offline
  fi
fi

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  AVISO: DATABASE_URL não configurada"
else
  echo "✅ DATABASE_URL configurada"
  
  # Executar Prisma migrations
  echo "⏳ Rodando Prisma migrations..."
  npx prisma migrate deploy --skip-generate
  
  if [ $? -eq 0 ]; then
    echo "✅ Migrations executadas"
  else
    echo "❌ ERRO nas migrations"
    exit 1
  fi
fi

# Verificar Prisma Client
if [ ! -d "node_modules/.prisma" ]; then
  echo "⏳ Gerando Prisma Client (fallback)..."
  npx prisma generate
  echo "✅ Prisma Client gerado"
else
  echo "✅ Prisma Client já existe"
fi

echo "=== STARTUP CONCLUÍDO ==="
echo "🚀 Iniciando Next.js server..."

# CRITICAL: Iniciar o Next.js
exec npm start
