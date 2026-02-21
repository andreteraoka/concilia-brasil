#!/bin/bash
set -e  # Exit on error

# === STARTUP CONVILHA BRASIL (STANDALONE MODE) ===
# Script de inicialização otimizado para Azure App Service Linux
# Logs disponíveis em: /home/LogFiles/startup.log

echo "⏳ Iniciando ambiente (Standalone Mode)..."
echo "Timestamp: $(date)"

# CRITICAL: Migrations do Prisma
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  AVISO: DATABASE_URL não encontrada. As migrations serão ignoradas."
else
    echo "⏳ Rodando Prisma migrations..."
    # npx prisma migrate deploy --skip-generate
    # Caso npx esteja lento, podemos usar o binário direto do prisma
    ./node_modules/.bin/prisma migrate deploy --skip-generate
    echo "✅ Migrations concluídas."
fi

# Ajuste de permissões (se necessário)
chmod -R 755 .

# CRITICAL: Inicializar Next.js Server
# No modo standalone, o server.js está na raiz do pacote enviado.
if [ -f "server.js" ]; then
    echo "🚀 Servidor detectado. Iniciando node server.js..."
    
    # Pró-ativo: Azure espera tráfego na porta 8080 ou detecta a porta.
    # O Next.js standalone usa a variável PORT ou padrão 3000.
    export PORT="${PORT:-3000}"
    echo "Escutando na porta: ${PORT}"
    
    exec node server.js
else
    echo "❌ erro: server.js não encontrado na raiz (/home/site/wwwroot/)."
    echo "Verificando estrutura de arquivos:"
    ls -la
    exit 1
fi
