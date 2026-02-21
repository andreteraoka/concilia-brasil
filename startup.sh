#!/bin/bash
set -e  # Sair em caso de erro

# === LOG DE INICIALIZAÇÃO - CONCILIA BRASIL ===
# O Azure redireciona STDOUT/STDERR para os logs (/home/LogFiles/...)
echo "===================================================="
echo "🚀 INICIANDO CONCILIA BRASIL - STANDALONE MODE"
echo "📅 Data/Hora: $(date)"
echo "📂 Diretório Atual: $(pwd)"
echo "🔍 Listagem de Arquivos:"
ls -F
echo "===================================================="

# 1. VERIFICAR VARIÁVEIS CRÍTICAS
if [ -z "$DATABASE_URL" ]; then
    echo "❌ [ERRO] DATABASE_URL não está configurada no Azure!"
    # Mas tentaremos subir mesmo assim se for opcional
else
    echo "✅ [INFO] DATABASE_URL encontrada."
fi

# 2. RODAR MIGRATIONS (SE POSSÍVEL)
# No modo standalone, o Prisma binary deve estar no node_modules copiado
if [ -f "./node_modules/.bin/prisma" ]; then
    echo "⏳ [MIGRATE] Rodando Prisma Migrate Deploy..."
    ./node_modules/.bin/prisma migrate deploy --skip-generate || echo "⚠️ [AVISO] Falha ou nada para migrar."
else
    echo "⚠️ [AVISO] Binário do Prisma não encontrado; pulando migrations automáticas."
fi

# 3. CONFIGURAR PORTA (O Azure espera tráfego na porta enviada pelo WEBSITES_PORT)
export PORT="${PORT:-3000}"
export HOSTNAME="0.0.0.0"

echo "📡 [SERVER] Escutando em $HOSTNAME na porta $PORT"
echo "===================================================="

# 4. EXECUTAR SERVER (O server.js foi gerado pelo Next.js Standalone build)
if [ -f "server.js" ]; then
    echo "🔥 [START] node server.js"
    exec node server.js
else
    echo "❌ [ERRO CRÍTICO] server.js NÃO ENCONTRADO na raiz!"
    echo "Estrutura detectada:"
    ls -R | head -n 20
    exit 1
fi
