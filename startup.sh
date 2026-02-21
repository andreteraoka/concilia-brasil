#!/bin/bash
set -e  # Exit on error

# Startup script para Concilia Brasil - Azure App Service Linux
# Logs disponíveis em: /home/LogFiles/startup.log

echo "=== STARTUP: Iniciando Concilia Brasil ==="
echo "Timestamp: $(date)"
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Working directory: $(pwd)"

# CRITICAL: Instalar dependências se node_modules estiver vazio/incompleto
NODE_MODULES_SIZE=$(du -sm node_modules 2>/dev/null | cut -f1 || echo "0")
echo "node_modules atual: ${NODE_MODULES_SIZE}MB"

if [ "$NODE_MODULES_SIZE" -lt 500 ]; then
  echo "⚠️  node_modules incompleto (${NODE_MODULES_SIZE}MB < 500MB esperado)"
  echo "⏳ Instalando dependências com npm ci..."
  npm ci --prefer-offline --no-audit
  echo "✅ Dependências instaladas"
else
  echo "✅ node_modules OK (${NODE_MODULES_SIZE}MB)"
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
  echo "⏳ Gerando Prisma Client..."
  npx prisma generate
  echo "✅ Prisma Client gerado"
else
  echo "✅ Prisma Client já existe"
fi

echo "=== STARTUP CONCLUÍDO ==="
echo "🚀 Iniciando Next.js server..."

# CRITICAL: Iniciar o Next.js
exec npm start
