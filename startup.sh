#!/bin/bash

# Startup script para Concilia Brasil
# Executado automaticamente pelo Azure App Service

echo "=== STARTUP: Iniciando Concilia Brasil ==="
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# Verificar CONNECTION
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  AVISO: DATABASE_URL não configurada"
else
  echo "✅ DATABASE_URL configurada"
  
  # Executar Prisma migrations
  echo "⏳ Executando Prisma migrations..."
  npx prisma migrate deploy --skip-generate
  
  if [ $? -eq 0 ]; then
    echo "✅ Prisma migrations executadas com sucesso"
  else
    echo "❌ ERRO ao executar Prisma migrations"
    exit 1
  fi
fi

# Gerar Prisma Client se necessário
if [ ! -d "node_modules/.prisma" ]; then
  echo "⏳ Gerando Prisma Client..."
  npx prisma generate
  echo "✅ Prisma Client gerado"
fi

echo "=== STARTUP CONCLUÍDO ==="
echo "Aplicação pronta para receber requisições"
